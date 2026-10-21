/* ---------- 3D 실사 바디 피팅 (MakeHuman CC0 메시 기반) — OTJAL · Rat Rae Choi ---------- */
const Fig3D = (() => {
  const T = window.THREE;
  const ok = (() => { try { if (!T || !T.WebGLRenderer || typeof DecompressionStream==="undefined" || !document.getElementById("otjal-body")) return false; const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl")); } catch(e){ return false; } })();
  const SKIN = {"밝은":"#EAC6B0","중간":"#DDB092","웜":"#CB9871","딥":"#9C6847"};
  const HAIRC = {"블랙":"#141111","흑갈":"#2A201C","브라운":"#553627","밀크브라운":"#87644B","애쉬":"#6B6560"};
  const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, sstep=(a,b,v)=>{ const t=clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); };
  const texCache = {};
  function rnd(seed){ let s=seed%2147483647||7; return ()=> (s=(s*16807)%2147483647)/2147483647; }

  /* ===== 바디 데이터 로드 ===== */
  let D=null, LP=null;
  function load(){ if (LP) return LP;
    LP=(async()=>{ const s=document.getElementById("otjal-body").textContent.replace(/\s+/g,""), bin=atob(s), u=new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
      const buf=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
      const n=new DataView(buf).getUint32(0,true), h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,n))), base=4+n+((8-(4+n)%8)%8), A={};
      const C={uint16:Uint16Array,uint8:Uint8Array,int16:Int16Array,int8:Int8Array};
      for (const [nm,dt,off,size] of h.arrays) A[nm]=new C[dt](buf,base+off,size);
      D={h,A,nU:h.nU}; prep(); getSkinTex("F"); await Promise.all(skinImgs.map(im=>im.decode?im.decode().catch(()=>{}):null)); return D; })();
    return LP; }
  function prep(){ const {h,A}=D, [b0,b1]=h.groups.body, nb=b1-b0, UT=new Uint32Array(nb*3);
    for (let k=0;k<nb*3;k++) UT[k]=A.pv[A.tri[b0*3+k]];
    D.UT=UT; const isB=new Uint8Array(D.nU); for (const v of UT) isB[v]=1; D.isB=isB;
    D.RI=Object.fromEntries(h.regions.map((r,i)=>[r,i]));
    const eye=[]; for (const gname of ["helper-l-eye","helper-r-eye"]){ const [a,b]=h.groups[gname], s=new Set(); for (let k=a*3;k<b*3;k++) s.add(A.pv[A.tri[k]]); eye.push([...s]); } D.eyeV=eye;
    // vertex -> triangles (CSR)
    const cnt=new Uint32Array(D.nU+1); for (const v of UT) cnt[v+1]++; for (let i=0;i<D.nU;i++) cnt[i+1]+=cnt[i];
    const vt=new Uint32Array(UT.length), fill=cnt.slice(0,D.nU); for (let t=0;t<nb;t++) for (let k=0;k<3;k++) vt[fill[UT[t*3+k]]++]=t; D.vtS=cnt; D.vt=vt;
    const R=D.RI, rw=A.rw, nR=h.regions.length; D.nR=nR;
    D.arm=new Float32Array(D.nU); D.reg=(i,r)=>rw[i*nR+R[r]]/255;
    for (let i=0;i<D.nU;i++) D.arm[i]=(rw[i*nR+R.uarm]+rw[i*nR+R.larm]+rw[i*nR+R.hand])/255;
  }

  /* ===== 체형 → 형태계수 풀이 ===== */
  const DEF={F:{height:163,weight:52,shoulder:37,inseam:74,armLen:54},M:{height:175,weight:70,shoulder:45,inseam:80,armLen:60}};
  const ABS={"bust-circ":"chest","underbust-circ":"underbust","waist-circ":"waist","hips-circ":"hip","thigh-circ":"thigh","calf-circ":"calf","upperarm-circ":"arm"};
  function solve(g,p){ const G=D.h.gender[g], m0=G.m0, SH=G.shapes, d=DEF[g], H=p.height/100, c={};
    const bmi=(p.weight||d.weight)/(H*H), bmi0=d.weight/((d.height/100)**2);
    c.weight=clamp((bmi-bmi0)/7,-1,1)*0.75-(g==="F"?0.3:0.2); c.muscle=g==="M"?0.2:0.1; c.height=clamp((p.height-(g==="F"?160:173))/22,-1,1)*0.6;
    if (g==="F" && SH["cup+"]) c.cup=clamp(((p.chest-(p.underbust||p.chest-14))-14)/8,-0.8,1);
    const rel={ "shoulder-dist":(p.shoulder/p.height)/(d.shoulder/d.height),
      "upperleg-height":(p.inseam/p.height)/(d.inseam/d.height), "lowerleg-height":(p.inseam/p.height)/(d.inseam/d.height),
      "upperarm-length":(p.armLen/p.height)/(d.armLen/d.height), "lowerarm-length":(p.armLen/p.height)/(d.armLen/d.height) };
    const keys=Object.keys(ABS).filter(k=>p[ABS[k]]>0 && SH[k+"+"] && (k!=="underbust-circ"||g==="F")).concat(Object.keys(rel).filter(k=>SH[k+"+"]));
    const contrib=(s,x,j)=>{ const q=SH[s+(x>0?"+":"-")]; return q?Math.abs(x)*q.dm[j]:0; };
    const pred=j=>{ let m=m0[j]; for (const s in c) if (c[s]) m+=contrib(s,c[s],j); return m; };
    for (let it=0; it<10; it++){
      for (const k of keys){ const sc=H/pred("height"), tgt = ABS[k] ? p[ABS[k]]/100/sc : m0[k]*clamp(rel[k],0.8,1.2);
        const r=tgt-pred(k), x=c[k]||0, up=SH[k+"+"].dm[k], dn=-(SH[k+"-"]?SH[k+"-"].dm[k]:-up);
        const slope = (x>0||(x===0&&r>0)) ? up : dn; if (Math.abs(slope)<1e-6) continue;
        let nx=x+r/slope; if (x!==0 && Math.sign(nx)!==Math.sign(x)) nx=0; c[k]=clamp(nx,-1,1); } }
    return c; }

  /* ===== 모핑 + 포즈 ===== */
  const V3=(x,y,z)=>new T.Vector3(x,y,z);
  const bodyKey=p=>["height","weight","shoulder","chest","underbust","waist","hip","thigh","calf","arm","armLen","inseam"].map(k=>p[k]).join("|");
  const mcache=new Map();
  function morph(g,p){ const key=g+"|"+bodyKey(p); if (mcache.has(key)) return mcache.get(key);
    const {A,nU}=D, X=new Float32Array(nU*3), b=A[g+".base"]; for (let i=0;i<nU*3;i++) X[i]=b[i]*1e-4;
    const c=solve(g,p), SH=D.h.gender[g].shapes;
    for (const k in c){ const x=c[k]; if (Math.abs(x)<1e-3) continue; const nm=k+(x>0?"+":"-"), si=SH[nm]; if (!si) continue;
      const I=A[g+"."+nm+".i"], Dd=A[g+"."+nm+".d"], f=Math.abs(x)*si.sc;
      for (let j=0;j<I.length;j++){ const v=I[j]*3, q=j*3; X[v]+=Dd[q]*f; X[v+1]+=Dd[q+1]*f; X[v+2]+=Dd[q+2]*f; } }
    let y0=1e9,y1=-1e9; for (let i=0;i<nU;i++) if (D.isB[i]){ const y=X[i*3+1]; if (y<y0) y0=y; if (y>y1) y1=y; }
    const s=(p.height/100)/(y1-y0); let zc=0; const hl=D.h.meas["hips-circ"]; for (const v of hl) zc+=X[v*3+2]; zc/=hl.length;
    for (let i=0;i<nU;i++){ X[i*3]*=s; X[i*3+1]=(X[i*3+1]-y0)*s; X[i*3+2]=(X[i*3+2]-zc)*s; }
    const B={g,X,J:{}}; const JP=n=>{ const L=D.h.joints[n]; let x=0,y=0,z=0; for (const v of L){ x+=X[v*3]; y+=X[v*3+1]; z+=X[v*3+2]; } return V3(x/L.length,y/L.length,z/L.length); };
    for (const n in D.h.joints) B.J[n]=JP(n);
    const loopY=k=>{ const L=D.h.meas[k]; let y=0; for (const v of L) y+=X[v*3+1]; return y/L.length; };
    B.y={bust:loopY("bust-circ"),under:loopY("underbust-circ"),waist:loopY("waist-circ"),hip:loopY("hips-circ"),neck:loopY("neck-circ"),knee:B.J["lowerleg01.L"].y,ankle:B.J["foot.L"].y,top:p.height/100};
    let cr=1e9; for (let i=0;i<nU;i++) if (D.isB[i] && Math.abs(X[i*3])<0.012 && X[i*3+1]>B.y.knee+0.05 && X[i*3+1]<B.y.hip && D.arm[i]<0.3) cr=Math.min(cr,X[i*3+1]);
    B.y.crotch=cr;
    pose(B);
    B.N=normals(X,D.UT,nU);
    mcache.set(key,B); if (mcache.size>24) mcache.delete(mcache.keys().next().value); return B; }

  function pose(B){ const {X}=B, A=D.A, nU=D.nU;
    for (const [sx,S] of [[1,"L"],[-1,"R"]]){ const hj=B.J["upperleg01."+S], ft=B.J["foot."+S], kn=B.J["lowerleg01."+S];
      const tgt=V3(sx*(B.g==="F"?0.072:0.092), ft.y, ft.z).sub(hj).normalize(), q=new T.Quaternion().setFromUnitVectors(ft.clone().sub(hj).normalize(), tgt), pp=V3(0,0,0);
      for (let i=0;i<nU;i++){ const w=A.wG[i]/255; if (w<=0 || X[i*3]*sx<=0) continue; pp.set(X[i*3],X[i*3+1],X[i*3+2]).sub(hj).applyQuaternion(q).add(hj);
        X[i*3]+=(pp.x-X[i*3])*w; X[i*3+1]+=(pp.y-X[i*3+1])*w; X[i*3+2]+=(pp.z-X[i*3+2])*w; }
      for (const n of ["lowerleg01."+S,"foot."+S,"lowerleg02."+S]) if (B.J[n]) B.J[n]=B.J[n].clone().sub(hj).applyQuaternion(q).add(hj); }
    let hipHalf=0; for (const v of D.h.meas["hips-circ"]) hipHalf=Math.max(hipHalf,Math.abs(X[v*3]));
    for (const [sx,S] of [[1,"L"],[-1,"R"]]){
      const s=B.J["upperarm01."+S], e=B.J["lowerarm01."+S], w=B.J["wrist."+S], L1=e.distanceTo(s), L2=w.distanceTo(e);
      const need=hipHalf+0.052, a=Math.asin(clamp((need-Math.abs(s.x))/(L1+L2*0.92),Math.sin(0.07),Math.sin(0.5)));
      const dir=V3(sx*Math.sin(a),-Math.cos(a),0.035).normalize();
      const q1=new T.Quaternion().setFromUnitVectors(e.clone().sub(s).normalize(),dir), e1=e.clone().sub(s).applyQuaternion(q1).add(s);
      const f0=w.clone().sub(e).applyQuaternion(q1).normalize(), fd=dir.clone().add(V3(-sx*0.02,0,0.2)).normalize();
      const q2=new T.Quaternion().setFromUnitVectors(f0,fd), w1=w.clone().sub(e).applyQuaternion(q1).applyQuaternion(q2).add(e1);
      const pa=V3(0,0,0), pf=V3(0,0,0);
      for (let i=0;i<nU;i++){ const wa=A.wA[i]/255; if (wa<=0 || X[i*3]*sx<=0) continue; const wf=Math.min(wa,A.wF[i]/255);
        pa.set(X[i*3],X[i*3+1],X[i*3+2]).sub(s).applyQuaternion(q1).add(s); pf.copy(pa).sub(e1).applyQuaternion(q2).add(e1);
        const w0=1-wa, w2=wa-wf; X[i*3]=w0*X[i*3]+w2*pa.x+wf*pf.x; X[i*3+1]=w0*X[i*3+1]+w2*pa.y+wf*pf.y; X[i*3+2]=w0*X[i*3+2]+w2*pa.z+wf*pf.z; }
      B.J["lowerarm01."+S]=e1; B.J["wrist."+S]=w1; B["arm"+S]={s,e:e1,w:w1,L1,L2,sx}; } }

  function normals(X,UT,n){ const N=new Float32Array(n*3);
    for (let t=0;t<UT.length;t+=3){ const a=UT[t]*3,b=UT[t+1]*3,c=UT[t+2]*3;
      const ux=X[b]-X[a],uy=X[b+1]-X[a+1],uz=X[b+2]-X[a+2], vx=X[c]-X[a],vy=X[c+1]-X[a+1],vz=X[c+2]-X[a+2];
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      for (const k of [a,b,c]){ N[k]+=nx; N[k+1]+=ny; N[k+2]+=nz; } }
    for (let i=0;i<n;i++){ const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1; N[i*3]/=l; N[i*3+1]/=l; N[i*3+2]/=l; } return N; }

  /* ===== 단면 볼록껍질 (옷감이 오목부를 덮는 효과) ===== */
  const NA=72, BIN=0.01;
  function hull2(pts){ if (pts.length<3) return pts; pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]); const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lo=[],up=[]; for (const p of pts){ while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
    for (let i=pts.length-1;i>=0;i--){ const p=pts[i]; while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up); }
  function rayHull(H,cx,cz,th){ const dx=Math.sin(th), dz=Math.cos(th); let best=0;
    for (let i=0;i<H.length;i++){ const [ax,az]=H[i], [bx,bz]=H[(i+1)%H.length], ex=bx-ax, ez=bz-az, den=dx*ez-dz*ex; if (Math.abs(den)<1e-12) continue;
      const t=((ax-cx)*ez-(az-cz)*ex)/den, u=((ax-cx)*dz-(az-cz)*dx)/den; if (t>0 && u>=-1e-6 && u<=1+1e-6) best=Math.max(best,t); } return best; }
  // filter(i) -> include vertex; returns table {y0, n, cx[], cz[], R[n*NA]}
  function table(B, filter, y0, y1, fixedCenter){ const {X}=B, n=Math.max(1,Math.ceil((y1-y0)/BIN)+1), pts=Array.from({length:n},()=>[]);
    for (let i=0;i<D.nU;i++){ if (!D.isB[i] || !filter(i)) continue; const y=X[i*3+1]; if (y<y0-BIN||y>y1+BIN) continue;
      const k=Math.round((y-y0)/BIN); for (const kk of [k-1,k,k+1]) if (kk>=0&&kk<n) pts[kk].push([X[i*3],X[i*3+2]]); }
    const t={y0,n,cx:new Float32Array(n),cz:new Float32Array(n),R:new Float32Array(n*NA)};
    let last=null;
    for (let k=0;k<n;k++){ let H=hull2(pts[k]); if (H.length<3){ if (last){ t.cx[k]=t.cx[k-1]; t.cz[k]=t.cz[k-1]; t.R.copyWithin(k*NA,(k-1)*NA,k*NA); } continue; }
      let mx=0,mz=0; if (fixedCenter){ mx=fixedCenter[0]; mz=fixedCenter[1]; } else { let a=1e9,b=-1e9,c=1e9,d=-1e9; for (const [x,z] of H){ a=Math.min(a,x); b=Math.max(b,x); c=Math.min(c,z); d=Math.max(d,z); } mx=(a+b)/2; mz=(c+d)/2; }
      t.cx[k]=mx; t.cz[k]=mz; for (let a=0;a<NA;a++) t.R[k*NA+a]=rayHull(H,mx,mz,a/NA*Math.PI*2-Math.PI); last=H; }
    // 빈 구간 앞쪽 채우기
    let f=-1; for (let k=0;k<n;k++) if (t.R[k*NA]>0){ f=k; break; } for (let k=0;k<f;k++){ t.cx[k]=t.cx[f]; t.cz[k]=t.cz[f]; t.R.copyWithin(k*NA,f*NA,(f+1)*NA); }
    return t; }
  function tq(t,y,th){ const fk=clamp((y-t.y0)/BIN,0,t.n-1), k0=Math.floor(fk), k1=Math.min(t.n-1,k0+1), wk=fk-k0;
    const fa=((th+Math.PI)/(Math.PI*2))*NA, a0=((Math.floor(fa)%NA)+NA)%NA, a1=(a0+1)%NA, wa=fa-Math.floor(fa);
    const r0=t.R[k0*NA+a0]*(1-wa)+t.R[k0*NA+a1]*wa, r1=t.R[k1*NA+a0]*(1-wa)+t.R[k1*NA+a1]*wa; return r0*(1-wk)+r1*wk; }
  function tc(t,y){ const fk=clamp((y-t.y0)/BIN,0,t.n-1), k0=Math.floor(fk), k1=Math.min(t.n-1,k0+1), wk=fk-k0; return [t.cx[k0]*(1-wk)+t.cx[k1]*wk, t.cz[k0]*(1-wk)+t.cz[k1]*wk]; }
  function tables(B){ if (B.T) return B.T; const R=D.reg, y=B.y;
    const notArm=i=>D.arm[i]<0.45 && R(i,"head")<0.6 && R(i,"foot")<0.4;
    const torso=table(B, notArm, 0, y.top);
    const legs={}; for (const sx of [1,-1]) legs[sx]=table(B, i=>notArm(i)&&B.X[i*3]*sx>0.004, y.ankle-0.06, y.crotch+0.06);
    const feet={}; for (const sx of [1,-1]) feet[sx]=table(B, i=>R(i,"foot")+R(i,"lleg")>0.5 && B.X[i*3]*sx>0, 0, y.ankle+0.25);
    const head=table(B, i=>R(i,"head")>0.5, y.neck-0.05, y.top);
    return B.T={torso,legs,feet,head}; }

  /* ===== 바디 메시 → 의복 메시 ===== */
  function cutMesh(B, f){ const {X}=B, UT=D.UT, tris=[];
    for (let t=0;t<UT.length;t+=3){ const a=UT[t],b=UT[t+1],c=UT[t+2]; if (f[a]>=0||f[b]>=0||f[c]>=0) tris.push(a,b,c); }
    const map=new Int32Array(D.nU).fill(-1), src=[]; for (const v of tris) if (map[v]<0){ map[v]=src.length; src.push(v); }
    const P=new Float32Array(src.length*3);
    for (let k=0;k<src.length;k++){ const v=src[k]; P[k*3]=X[v*3]; P[k*3+1]=X[v*3+1]; P[k*3+2]=X[v*3+2]; }
    // 바깥 꼭짓점은 경계선으로 당겨 깔끔한 단(hem)을 만든다
    const acc=new Float32Array(src.length*4);
    for (let t=0;t<tris.length;t+=3) for (let k=0;k<3;k++){ const o=tris[t+k]; if (f[o]>=0) continue;
      for (let j=1;j<3;j++){ const n=tris[t+(k+j)%3]; if (f[n]<0) continue; const s=f[n]/(f[n]-f[o]), mo=map[o];
        for (let d=0;d<3;d++) acc[mo*4+d]+=X[n*3+d]+(X[o*3+d]-X[n*3+d])*s; acc[mo*4+3]++; } }
    for (let k=0;k<src.length;k++) if (acc[k*4+3]>0) for (let d=0;d<3;d++) P[k*3+d]=acc[k*4+d]/acc[k*4+3];
    const idx=new Uint32Array(tris.length); for (let i=0;i<tris.length;i++) idx[i]=map[tris[i]];
    return {P, idx, src}; }
  function meshNormals(P,idx){ const n=P.length/3, N=new Float32Array(n*3);
    for (let t=0;t<idx.length;t+=3){ const a=idx[t]*3,b=idx[t+1]*3,c=idx[t+2]*3; const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2], vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; for (const k of [a,b,c]){ N[k]+=nx; N[k+1]+=ny; N[k+2]+=nz; } }
    for (let i=0;i<n;i++){ const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1; N[i*3]/=l; N[i*3+1]/=l; N[i*3+2]/=l; } return N; }
  function smoothPos(P,idx,iters,lam,mask){ const n=P.length/3; const nb=Array.from({length:n},()=>new Set());
    for (let t=0;t<idx.length;t+=3) for (let k=0;k<3;k++){ const a=idx[t+k]; nb[a].add(idx[t+(k+1)%3]); nb[a].add(idx[t+(k+2)%3]); }
    const Q=new Float32Array(P.length);
    for (let it=0;it<iters;it++){ for (let i=0;i<n;i++){ const w=mask?mask[i]*lam:lam; if (!w||!nb[i].size){ Q[i*3]=P[i*3]; Q[i*3+1]=P[i*3+1]; Q[i*3+2]=P[i*3+2]; continue; }
        let x=0,y=0,z=0; for (const j of nb[i]){ x+=P[j*3]; y+=P[j*3+1]; z+=P[j*3+2]; } const c=nb[i].size; Q[i*3]=lerp(P[i*3],x/c,w); Q[i*3+1]=lerp(P[i*3+1],y/c,w); Q[i*3+2]=lerp(P[i*3+2],z/c,w); }
      P.set(Q); } }
  // 단 두께(경계 모서리를 안쪽으로 접어 넣음)
  function hemBand(P,idx,N,th){ const ec=new Map(); const K=(a,b)=>a<b?a*1e6+b:b*1e6+a;
    for (let t=0;t<idx.length;t+=3) for (let k=0;k<3;k++){ const a=idx[t+k], b=idx[t+(k+1)%3], key=K(a,b); const e=ec.get(key); if (e) e.c++; else ec.set(key,{a,b,c:1}); }
    const bnd=[...ec.values()].filter(e=>e.c===1); if (!bnd.length) return {P,idx};
    const n=P.length/3, extra=new Map(); const P2=[...P], I2=[...idx];
    const inner=v=>{ if (!extra.has(v)){ extra.set(v,n+extra.size); P2.push(P[v*3]-N[v*3]*th, P[v*3+1]-N[v*3+1]*th, P[v*3+2]-N[v*3+2]*th); } return extra.get(v); };
    for (const {a,b} of bnd){ const ia=inner(a), ib=inner(b); I2.push(b,a,ia, b,ia,ib); }
    return {P:new Float32Array(P2), idx:new Uint32Array(I2)}; }
  function geoFrom(P,idx){ const geo=new T.BufferGeometry(); geo.setAttribute("position",new T.BufferAttribute(P,3)); geo.setIndex(new T.BufferAttribute(idx,1)); geo.computeVertexNormals(); return geo; }
  function finish(P,idx,ease,mat,o={}){ // ease: Float32Array per vertex
    if (o.smooth) smoothPos(P,idx,o.smooth,0.5,o.smask);
    let N=meshNormals(P,idx); for (let i=0;i<P.length/3;i++){ const e=ease[i]; P[i*3]+=N[i*3]*e; P[i*3+1]+=N[i*3+1]*e; P[i*3+2]+=N[i*3+2]*e; }
    if (o.smooth2) smoothPos(P,idx,o.smooth2,0.35);
    N=meshNormals(P,idx); const hb=hemBand(P,idx,N,o.hem||0.004);
    const m=new T.Mesh(geoFrom(hb.P,hb.idx),mat); m.castShadow=true; m.receiveShadow=true; return m; }

  /* ===== 원단 ===== */
  function fabricKind(it){ const n=it.name, Dt=(DETAIL[it.id]||[""])[0];
    if (/트위드/.test(n)) return "tweed"; if (/스트라이프/.test(n)) return "stripe"; if (/플라워/.test(n)) return "flower";
    if (/패딩|다운/.test(n)) return "quilt"; if (/데님|청바지|트러커/.test(n)) return "denim";
    if (/니트|가디건|앙고라|케이블/.test(n)) return "knit";
    if (it.cat==="shoes"||it.cat==="bag") return /캔버스|스니커즈|러닝|나일론/.test(n) ? "canvas" : "leather";
    if (/린넨/.test(Dt)) return "linen"; if (/바람|파카|쇼츠|레깅스|트레이닝|조거|기능성|플리스/.test(n)) return "tech"; return "cotton"; }
  function fabricTex(kind, hex){ const key=kind+hex; if (texCache[key]) return texCache[key];
    const c=document.createElement("canvas"); c.width=c.height=256; const x=c.getContext("2d"), R=rnd(parseInt(hex.slice(1),16)+kind.length*131);
    const dk=shade(hex,-.2), lt=shade(hex,.22); x.fillStyle=hex; x.fillRect(0,0,256,256);
    const spray=(n,cols,a,w,h)=>{ for(let i=0;i<n;i++){ x.globalAlpha=a; x.fillStyle=cols[i%cols.length]; x.fillRect(R()*256,R()*256,w,h);} };
    if (kind==="knit"){ for(let i=0;i<256;i+=8){ x.globalAlpha=.22; x.fillStyle=dk; x.fillRect(i,0,2.5,256); x.globalAlpha=.14; x.fillStyle=lt; x.fillRect(i+4,0,2,256);} spray(900,[lt,dk],.08,2,2); }
    else if (kind==="tweed"){ spray(3400,[dk,lt,"#FFFFFF","#C9A27C",shade(hex,-.4)],.6,3,1.6); }
    else if (kind==="denim"){ x.globalAlpha=.25; x.strokeStyle=lt; x.lineWidth=1.2; for(let i=-256;i<256;i+=4){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+256,256); x.stroke(); } spray(1800,[dk,"#FFFFFF"],.12,1,3); }
    else if (kind==="stripe"){ x.globalAlpha=.85; x.fillStyle=shade(hex,-.35); for(let i=0;i<256;i+=21) x.fillRect(i,0,6,256); }
    else if (kind==="flower"){ for(let n=0;n<34;n++){ const cx=R()*256, cy=R()*256; x.globalAlpha=.95; x.fillStyle="#FFFFFF"; for(let k=0;k<5;k++){ const a=k/5*6.283; x.beginPath(); x.arc(cx+Math.cos(a)*5,cy+Math.sin(a)*5,3.6,0,7); x.fill(); } x.fillStyle="#F2C14E"; x.beginPath(); x.arc(cx,cy,2.6,0,7); x.fill(); x.globalAlpha=.55; x.fillStyle=shade(hex,-.32); x.beginPath(); x.ellipse(cx+10,cy+8,5,2,.6,0,7); x.fill(); } }
    else if (kind==="quilt"){ for(let j=0;j<256;j+=32){ const g=x.createLinearGradient(0,j,0,j+32); g.addColorStop(0,dk); g.addColorStop(.2,hex); g.addColorStop(.55,lt); g.addColorStop(1,dk); x.globalAlpha=1; x.fillStyle=g; x.fillRect(0,j,256,32);} }
    else if (kind==="leather"){ spray(4000,[dk,lt],.07,2,2); }
    else if (kind==="linen"){ x.globalAlpha=.12; for(let i=0;i<256;i+=3){ x.fillStyle=R()>.5?dk:lt; x.fillRect(i,0,1,256); x.fillRect(0,i,256,1);} }
    else if (kind==="canvas"||kind==="tech"){ x.globalAlpha=.08; for(let i=0;i<256;i+=2){ x.fillStyle=dk; x.fillRect(i,0,1,256);} }
    else if (kind==="hair"){ x.globalAlpha=1; for(let i=0;i<256;i++){ const v=R(); x.fillStyle=v>.6?lt:v<.3?dk:hex; x.globalAlpha=.35+R()*.4; x.fillRect(i,0,1,256); } }
    else { spray(2400,[dk,lt],.05,2,1); }
    const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.encoding=T.sRGBEncoding; t.anisotropy=4; texCache[key]=t; return t; }
  // UV 없이 원단 패턴을 입히는 트라이플래너 매핑
  function triplanar(m, tile){ m.onBeforeCompile=sh=>{ sh.uniforms.tpS={value:1/tile};
      sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vTpP; varying vec3 vTpN;").replace("#include <begin_vertex>","#include <begin_vertex>\nvTpP=position; vTpN=normal;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform float tpS; varying vec3 vTpP; varying vec3 vTpN;").replace("#include <map_fragment>",
        "#ifdef USE_MAP\n vec3 bw=pow(abs(normalize(vTpN)),vec3(4.0)); bw/=(bw.x+bw.y+bw.z);\n vec4 texelColor=texture2D(map,vTpP.zy*tpS)*bw.x+texture2D(map,vTpP.xz*tpS)*bw.y+texture2D(map,vTpP.xy*tpS)*bw.z;\n texelColor=mapTexelToLinear(texelColor); diffuseColor*=texelColor;\n#endif"); };
    m.customProgramCacheKey=()=>"tp"+tile; return m; }
  function clothMat(it, hexOverride){ const hex=hexOverride||COLORS[it.color].h, k=fabricKind(it);
    const m=new T.MeshPhysicalMaterial({ color:0xffffff, map:fabricTex(k,hex), roughness:({leather:.42,quilt:.36,tech:.5,denim:.88,knit:.95,tweed:.92,canvas:.85})[k]||.8, metalness:0, side:T.DoubleSide, envMapIntensity:.35 });
    if (["knit","tweed","cotton","linen"].includes(k)) m.sheen = new T.Color(shade(hex,.1));
    if (["leather","quilt","tech"].includes(k)) { m.clearcoat=.3; m.clearcoatRoughness=.45; }
    return triplanar(m, ({quilt:.9,stripe:.26,flower:.34,denim:.12,tweed:.16,knit:.15,hair:.12})[k]||.2); }
  const basicMat=(hex,o={})=>new T.MeshPhysicalMaterial(Object.assign({color:hex,roughness:.6,metalness:0,envMapIntensity:.35},o));

  /* ===== 피부 / 눈 / 머리 ===== */
  let skinTex=null, eyeTex=null; const skinImgs=[];
  function getSkinTex(g){ if (skinTex===null){ const el=document.getElementById("otjal-skin"); skinTex=el?{}:false;
      if (el) el.textContent.trim().split("|").forEach((src,i)=>{ const img=new Image(), t=new T.Texture(img); t.encoding=T.sRGBEncoding; t.anisotropy=8; img.onload=()=>{ t.needsUpdate=true; if (L) L.dirty=true; }; img.src=src; if (img.complete) t.needsUpdate=true; skinTex[i?"M":"F"]=t; skinImgs.push(img); }); }
    return skinTex && skinTex[g]; }
  function getEyeTex(){ if (eyeTex) return eyeTex; const c=document.createElement("canvas"); c.width=256; c.height=128; const x=c.getContext("2d");
    const wg=x.createRadialGradient(128,64,10,128,64,150); wg.addColorStop(0,"#EDE7E1"); wg.addColorStop(1,"#BDB1AA"); x.fillStyle=wg; x.fillRect(0,0,256,128); const cx=128, cy=64;
    const g=x.createRadialGradient(cx,cy,2,cx,cy,22); g.addColorStop(0,"#120c0a"); g.addColorStop(.32,"#140e0b"); g.addColorStop(.36,"#4a3020"); g.addColorStop(.8,"#2c1d14"); g.addColorStop(1,"#1a120e");
    x.fillStyle=g; x.beginPath(); x.ellipse(cx,cy,20,40,0,0,7); x.fill();
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return eyeTex=t; }
  const SKIN_BASE=new T.Color(0.925,0.80,0.725).convertSRGBToLinear();
  function skinMat(g,p){ const st=getSkinTex(g), tone=new T.Color(SKIN[p.skin]||SKIN["밝은"]).convertSRGBToLinear();
    const col = st ? new T.Color(Math.min(1.5,tone.r/SKIN_BASE.r),Math.min(1.5,tone.g/SKIN_BASE.g),Math.min(1.5,tone.b/SKIN_BASE.b)) : new T.Color(SKIN[p.skin]||SKIN["밝은"]);
    const m=new T.MeshPhysicalMaterial({color:col, map: st||null, roughness:.52, metalness:0, clearcoat:.05, clearcoatRoughness:.7, envMapIntensity:.4});
    m.sheen=new T.Color(0x2a1a16); return m; }
  function bodyMesh(B,p){ const {A}=D, nE=D.h.nE, P=new Float32Array(nE*3), N=new Float32Array(nE*3), UV=new Float32Array(nE*2), pv=A.pv;
    for (let i=0;i<nE;i++){ const v=pv[i]*3; P[i*3]=B.X[v]; P[i*3+1]=B.X[v+1]; P[i*3+2]=B.X[v+2]; N[i*3]=B.N[v]; N[i*3+1]=B.N[v+1]; N[i*3+2]=B.N[v+2]; UV[i*2]=A.uv[i*2]/65535; UV[i*2+1]=A.uv[i*2+1]/65535; }
    const geo=new T.BufferGeometry(); geo.setAttribute("position",new T.BufferAttribute(P,3)); geo.setAttribute("normal",new T.BufferAttribute(N,3)); geo.setAttribute("uv",new T.BufferAttribute(UV,2));
    const g=D.h.groups, [b0,b1]=g.body; const I=[]; for (let k=b0*3;k<b1*3;k++) I.push(A.tri[k]);
    const nb=I.length; for (const gn of ["helper-l-eyelashes-1","helper-l-eyelashes-2","helper-r-eyelashes-1","helper-r-eyelashes-2"]){ const [a,b]=g[gn]; for (let k=a*3;k<b*3;k++) I.push(A.tri[k]); }
    geo.setIndex(I); geo.addGroup(0,nb,0); geo.addGroup(nb,I.length-nb,1);
    const lash=new T.MeshStandardMaterial({color:0x241914,roughness:.8,side:T.DoubleSide,transparent:true,opacity:.7});
    const m=new T.Mesh(geo,[skinMat(B.g,p),lash]); m.castShadow=true; m.receiveShadow=true; return m; }
  function eyes(B,root){ const mat=new T.MeshPhysicalMaterial({map:getEyeTex(),roughness:.15,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:.6});
    for (const [S,vs] of [["L",D.eyeV[0]],["R",D.eyeV[1]]]){ const c=B.J["eye."+S]; let r=0; for (const v of vs) r+=Math.hypot(B.X[v*3]-c.x,B.X[v*3+1]-c.y,B.X[v*3+2]-c.z); r/=vs.length;
      const s=new T.Mesh(new T.SphereGeometry(r*0.985,32,20),mat); s.position.copy(c); s.rotation.y=-Math.PI/2+(S==="L"?0.06:-0.06); s.rotation.z=0.0; root.add(s); } }

  function hairLayer(B,p,root){ const hs=p.hair||"숏", X=B.X, R=D.reg, eL=B.J["eye.L"], eR=B.J["eye.R"], ey=(eL.y+eR.y)/2, top=B.y.top, F=B.g==="F", long=hs!=="숏";
    const HT=tables(B).head, TT=tables(B).torso, [hcx,hcz]=tc(HT,ey+0.03);
    const hex=HAIRC[p.hairColor]||"#2A201C", mat=new T.MeshPhysicalMaterial({color:0xffffff,map:fabricTex("hair",hex),roughness:.46,metalness:0,clearcoat:.12,clearcoatRoughness:.55,side:T.DoubleSide,envMapIntensity:.4});
    mat.sheen=new T.Color(shade(hex,.3)); triplanar(mat,.1);
    const yLine=th=>{ const c=Math.cos(th); const front=top-(F?0.058:0.054)-(F&&long?0.008:0), side=ey+(long?0.004:0.026), back=ey-(long?0.05:0.068);
      return c>0 ? lerp(side,front,Math.pow(c,1.25)) : lerp(side,back,Math.pow(-c,1.1)); };
    const f=new Float32Array(D.nU).fill(-1);
    for (let i=0;i<D.nU;i++){ if (!D.isB[i] || R(i,"head")<0.5) continue; const x=X[i*3], y=X[i*3+1], z=X[i*3+2]; f[i]=y-yLine(Math.atan2(x-hcx,z-hcz)); }
    const cm=cutMesh(B,f), n=cm.P.length/3, ease=new Float32Array(n);
    for (let k=0;k<n;k++){ const x=cm.P[k*3], y=cm.P[k*3+1], z=cm.P[k*3+2], th=Math.atan2(x-hcx,z-hcz), dl=Math.max(0,y-yLine(th));
      const [cx,cz]=tc(HT,y), t2=Math.atan2(x-cx,z-cz), r=Math.hypot(x-cx,z-cz), rr=Math.max(r,tq(HT,y,t2)*sstep(0,0.02,dl)+r*(1-sstep(0,0.02,dl)));
      cm.P[k*3]=cx+Math.sin(t2)*rr; cm.P[k*3+2]=cz+Math.cos(t2)*rr;
      ease[k]=sstep(0,0.03,dl)*((long?0.007:0.006)+sstep(ey,top,y)*(long?0.006:0.011)); }
    root.add(finish(cm.P,cm.idx,ease,mat,{smooth:3,smooth2:4,hem:0.0015}));
    if (hs==="묶음"){ const tail=[V3(0,top-0.05,hcz-0.105),V3(0,top-0.09,hcz-0.13),V3(0,ey-0.06,hcz-0.135),V3(0,ey-0.16,hcz-0.115)];
      const g=new T.TubeGeometry(new T.CatmullRomCurve3(tail),40,1,16,false), a=g.attributes.position;
      const crv=new T.CatmullRomCurve3(tail), pts=crv.getSpacedPoints(40);
      for (let i=0;i<a.count;i++){ const seg=Math.round(i/17); const c=pts[Math.min(40,Math.floor(i/17))], tt=Math.min(1,Math.floor(i/17)/40), rad=lerp(0.022,0.006,Math.pow(tt,1.3))*(tt<0.06?0.8:1);
        a.setXYZ(i, c.x+(a.getX(i)-c.x)*rad, c.y+(a.getY(i)-c.y)*rad, c.z+(a.getZ(i)-c.z)*rad); }
      g.computeVertexNormals(); const m=new T.Mesh(g,mat); m.castShadow=true; root.add(m);
      const tie=new T.Mesh(new T.TorusGeometry(0.016,0.005,8,20),basicMat("#1c1716")); tie.position.copy(tail[0]); tie.lookAt(tail[1]); root.add(tie); return; }
    if (!long) return;
    const yEnd = hs==="단발" ? ey-0.105 : hs==="중단발" ? B.J["upperarm01.L"].y-0.035 : B.y.bust-0.03, yS=top-0.004;
    const rows=Math.max(12,Math.round((yS-yEnd)/0.008)), cols=72, lim=y=> y>ey+0.035 ? 1.05 : y>ey-0.09 ? lerp(1.05, hs==="단발"?1.2:1.32, sstep(ey+0.035,ey-0.05,y)) : lerp(hs==="단발"?1.2:1.32, 1.95, sstep(ey-0.09,ey-0.2,y));
    const rnd2=rnd(7+hs.length), endJ=Array.from({length:cols+1},(_,c)=>{ const th=c/cols; return (rnd2()-0.5)*0.02 - 0.045*Math.pow(Math.sin(th*Math.PI),3); });
    const P=[], I=[], run=new Float32Array(cols+1);
    for (let r=0;r<=rows;r++) for (let c=0;c<=cols;c++){ const u=r/rows, yE=yEnd+endJ[c], y=lerp(yS,yE,u), L=lim(y), th=lerp(L,Math.PI*2-L,c/cols);
      let hr = y>B.y.neck-0.02 ? rayFrom(HT,Math.max(y,B.y.neck-0.02),hcx,hcz,th) : 0; run[c]=Math.max(run[c]*(y<ey+0.02?0.986:1), hr);
      const thick=lerp(0.014,0.02,sstep(0,0.6,u)), br = y<ey-0.07 ? rayFrom(TT,y,hcx,hcz,th)+0.03 : 0, rr=Math.max(run[c]+thick, br);
      P.push(hcx+Math.sin(th)*rr, y, hcz+Math.cos(th)*rr); }
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){ const a=r*(cols+1)+c, b=a+1, d=a+cols+1, e=d+1; I.push(a,d,b, b,d,e); }
    const Pa=new Float32Array(P), Ia=new Uint32Array(I); smoothPos(Pa,Ia,4,0.5);
    const N=meshNormals(Pa,Ia), hb=hemBand(Pa,Ia,N,0.006); const m=new T.Mesh(geoFrom(hb.P,hb.idx),mat); m.castShadow=true; m.receiveShadow=true; root.add(m); }
  function rayFrom(t,y,ox,oz,th){ // 바깥 점(ox,oz)에서 몸통 껍질까지 거리
    const [cx,cz]=tc(t,y); const dx=Math.sin(th), dz=Math.cos(th); let best=0;
    for (let a=0;a<NA;a++){ const at=a/NA*Math.PI*2-Math.PI, r=tq(t,y,at), px=cx+Math.sin(at)*r-ox, pz=cz+Math.cos(at)*r-oz, proj=px*dx+pz*dz, perp=Math.abs(px*dz-pz*dx); if (perp<0.02) best=Math.max(best,proj); } return best; }

  /* ===== 의복 생성 ===== */
  function armDist(B,i){ const sx=B.X[i*3]>0?"L":"R", a=B["arm"+sx]; if (!a) return -1; const p=V3(B.X[i*3],B.X[i*3+1],B.X[i*3+2]);
    const u1=a.e.clone().sub(a.s).normalize(), t1=p.clone().sub(a.s).dot(u1); if (t1<a.L1) return t1;
    const u2=a.w.clone().sub(a.e).normalize(); return a.L1+p.clone().sub(a.e).dot(u2); }
  function topLike(B,p,it,o){ // o: {yHem, sleeve, neck, ease, drape, open, layer}
    const {X}=B, R=D.reg, y=B.y, TT=tables(B).torso, nU=D.nU, f=new Float32Array(nU).fill(-1), AD=new Float32Array(nU).fill(-1);
    const nk=o.neck||{}; const neckY=th=>{ const c=Math.cos(th); let d=nk.back??0.008; if (c>0) d=lerp(d, nk.front??0.04, Math.pow(c,1.5));
      if (nk.v){ const w=Math.max(0,1-Math.abs(th)/0.55); d=Math.max(d, nk.v*w); } return y.neck+(nk.up||0)-d; };
    for (let i=0;i<nU;i++){ if (!D.isB[i]) continue; if (R(i,"head")>0.55||R(i,"hand")>0.35||R(i,"foot")>0.2||R(i,"lleg")>0.5) continue;
      const xi=X[i*3], yi=X[i*3+1], zi=X[i*3+2];
      if (D.arm[i]>0.5){ const ad=armDist(B,i); AD[i]=ad; f[i]=o.sleeve-ad; }
      else { const [cx,cz]=tc(TT,yi), th=Math.atan2(xi-cx,zi-cz); let v=Math.min(yi-o.yHem, neckY(th)-yi);
        if (o.open){ const c=Math.cos(th); if (c>0.3){ const gw=lerp(o.open[0],o.open[1],sstep(y.bust-0.05,y.neck,yi)); v=Math.min(v, Math.abs(xi)-gw); } }
        f[i]=v; } }
    const cm=cutMesh(B,f), n=cm.P.length/3, P=cm.P, ease=new Float32Array(n), sm=new Float32Array(n);
    const rB=th=>tq(TT,y.bust,th), rH=th=>tq(TT,y.hip,th);
    for (let k=0;k<n;k++){ const v=cm.src[k], am=D.arm[v], x=P[k*3], yy=P[k*3+1], z=P[k*3+2];
      if (am<0.75){ const [cx,cz]=tc(TT,yy), th=Math.atan2(x-cx,z-cz), r=Math.hypot(x-cx,z-cz); let rt=tq(TT,yy,th);
        if (yy<y.bust){ const t=clamp((y.bust-yy)/(y.bust-y.hip),0,1.4);
          if (o.drape==="regular"){ const fr=sstep(-0.2,0.6,Math.cos(th)); rt=Math.max(rt, lerp(rB(th)*0.93,rH(th)*0.985,Math.min(1,t))*lerp(0.97,1,fr)); }
          else if (o.drape==="over") rt=Math.max(rt, Math.max(rB(th),rH(th))*1.015); }
        const w=1-sstep(0.35,0.75,am), rr=Math.max(r, lerp(r,rt,w));
        P[k*3]=cx+Math.sin(th)*rr; P[k*3+2]=cz+Math.cos(th)*rr; }
      const sl=sstep(0.3,0.7,am); ease[k]=lerp(o.ease, o.sEase??o.ease, sl); if (o.hipEase && yy<y.waist+0.07) ease[k]=Math.max(ease[k], lerp(o.ease,o.hipEase,sstep(y.waist+0.07,y.waist+0.02,yy))*(1-sl)+ease[k]*sl); sm[k]=1; }
    const m=finish(P,cm.idx,ease,clothMat(it,o.hex),{smooth:o.layer==="outer"?3:2,hem:o.hem||0.004});
    m.userData.front=th=>0; return m; }

  function skirtLike(B,it,o){ // o: {yTop, yHem, flare, ease, pleat, open, hex}
    const TT=tables(B).torso, y=B.y, NC=96, rows=Math.max(8,Math.round((o.yTop-o.yHem)/0.012)), [cx,cz]=tc(TT,y.hip), P=[], I=[];
    const base=new Float32Array(NC); for (let c=0;c<NC;c++){ const th=c/NC*Math.PI*2-Math.PI; base[c]=Math.max(rayFrom(TT,y.hip,cx,cz,th), rayFrom(TT,y.hip-0.03,cx,cz,th)); }
    const prev=new Float32Array(NC);
    for (let r=0;r<=rows;r++){ const yy=lerp(o.yTop,o.yHem,r/rows), t=clamp((y.hip-yy)/((y.hip-o.yHem)||1),0,1), row=new Float32Array(NC);
      for (let c=0;c<NC;c++){ const th=c/NC*Math.PI*2-Math.PI; let rr;
        if (yy>=y.hip) rr=rayFrom(TT,yy,cx,cz,th); else rr=Math.max(base[c], rayFrom(TT,yy,cx,cz,th));
        rr = rr*(1+o.flare*Math.pow(t,1.25)) + o.ease;
        if (o.pleat) rr*=1+o.pleat*t*Math.sin(28*th);
        if (yy<y.hip) rr=Math.max(rr, prev[c]); row[c]=rr; }
      for (let c=0;c<NC;c++){ const a=row[(c+NC-1)%NC], b=row[c], d=row[(c+1)%NC]; prev[c]=Math.max(b,(a+2*b+d)/4); }
      for (let c=0;c<=NC;c++){ const cc=c%NC, th=cc/NC*Math.PI*2-Math.PI; if (o.open && Math.abs(th)<o.open && c!==NC) {}
        P.push(cx+Math.sin(th)*prev[cc], yy, cz+Math.cos(th)*prev[cc]); } }
    for (let r=0;r<rows;r++) for (let c=0;c<NC;c++){ const th=(c+0.5)/NC*Math.PI*2-Math.PI; if (o.open && Math.abs(th)<o.open) continue; const a=r*(NC+1)+c, b=a+1, d=a+NC+1, e=d+1; I.push(a,d,b, b,d,e); }
    const m=new T.Mesh(geoFrom(new Float32Array(P),new Uint32Array(I)),clothMat(it,o.hex)); m.castShadow=true; m.receiveShadow=true; return m; }

  function neckRing(B,off,rad,mat,dy=0){ const L=D.h.meas["neck-circ"], X=B.X; let cx=0,cy=0,cz=0; for (const v of L){ cx+=X[v*3]; cy+=X[v*3+1]; cz+=X[v*3+2]; } cx/=L.length; cy/=L.length; cz/=L.length;
    const pts=[]; for (let k=0;k<L.length-1;k+=1){ const v=L[k], dx=X[v*3]-cx, dz=X[v*3+2]-cz, r=Math.hypot(dx,dz)||1; pts.push(V3(cx+dx/r*(r+off), X[v*3+1]-cy+cy+dy, cz+dz/r*(r+off))); }
    const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),96,rad,8,true),mat); m.castShadow=true; return m; }
  function collarBand(B,off,hgt,mat,o={}){ const L=D.h.meas["neck-circ"], X=B.X; let cx=0,cy=0,cz=0; const n=L.length-1;
    for (let k=0;k<n;k++){ const v=L[k]; cx+=X[v*3]; cy+=X[v*3+1]; cz+=X[v*3+2]; } cx/=n; cy/=n; cz/=n;
    const ring=[]; for (let k=0;k<n;k++){ const v=L[k]; ring.push([X[v*3]-cx, X[v*3+1]-cy, X[v*3+2]-cz]); }
    const P=[], I=[], seg=96, gap=o.gap||0;
    const at=t=>{ const f=t*n, k=Math.floor(f)%n, k2=(k+1)%n, w=f-Math.floor(f); return ring[k].map((v,i)=>v*(1-w)+ring[k2][i]*w); };
    for (let s=0;s<=seg;s++){ const t=s/seg; const [dx,dy,dz]=at(t), r=Math.hypot(dx,dz)||1, th=Math.atan2(dx,dz); if (gap && Math.abs(th)<gap) { }
      for (const [hh,oo] of [[o.dy||-0.02,off],[(o.dy||-0.02)+hgt,off+(o.flare||0.006)]]) P.push(cx+dx/r*(r+oo), cy+dy+hh, cz+dz/r*(r+oo)); }
    for (let s=0;s<seg;s++){ const [dx,,dz]=at((s+0.5)/seg); if (gap && Math.abs(Math.atan2(dx,dz))<gap) continue; const a=s*2; I.push(a,a+2,a+1, a+1,a+2,a+3); }
    const Pa=new Float32Array(P), Ia=new Uint32Array(I), N=meshNormals(Pa,Ia), hb=hemBand(Pa,Ia,N,0.003);
    const m=new T.Mesh(geoFrom(hb.P,hb.idx),mat); m.castShadow=true; return m; }
  function ringAt(B,yy,off,rad,mat){ const TT=tables(B).torso, [cx,cz]=tc(TT,yy), pts=[];
    for (let a=0;a<64;a++){ const th=a/64*Math.PI*2-Math.PI, r=tq(TT,yy,th)+off; pts.push(V3(cx+Math.sin(th)*r,yy,cz+Math.cos(th)*r)); }
    const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),96,rad,8,true),mat); m.castShadow=true; return m; }

  function pantsLayer(B,p,it,G){ const {X}=B, R=D.reg, y=B.y, TB=tables(B), nU=D.nU, nm=it.name, short=it.shape==="pants-sh";
    const yW=y.waist-0.025, yHemL=short? y.knee+0.11 : y.ankle+0.012, f=new Float32Array(nU).fill(-1);
    for (let i=0;i<nU;i++){ if (!D.isB[i] || D.arm[i]>0.4 || R(i,"foot")>0.3 || R(i,"head")>0.3) continue; const yi=X[i*3+1]; f[i]=Math.min(yW-yi, yi-yHemL); }
    const cm=cutMesh(B,f), n=cm.P.length/3, P=cm.P, ease=new Float32Array(n);
    const wide=it.shape==="pants-w", leg=/레깅스/.test(nm), boot=/부츠컷/.test(nm), jog=/조거/.test(nm), straight=/스트레이트|치노|데님|슬랙스/.test(nm)&&!wide;
    const eH=clamp((G.hip-p.hip)/(2*Math.PI)/100*0.5,0.002,0.03);
    for (let k=0;k<n;k++){ const x=P[k*3], yy=P[k*3+1], z=P[k*3+2];
      if (yy>y.crotch+0.015){ const [cx,cz]=tc(TB.torso,yy), th=Math.atan2(x-cx,z-cz), r=Math.hypot(x-cx,z-cz), rr=Math.max(r,tq(TB.torso,yy,th)); P[k*3]=cx+Math.sin(th)*rr; P[k*3+2]=cz+Math.cos(th)*rr; }
      else { const sx=x>0?1:-1, t=TB.legs[sx], [cx,cz]=tc(t,yy), th=Math.atan2(x-cx,z-cz), r=Math.hypot(x-cx,z-cz);
        let rt=tq(t,yy,th); const thR=tq(t,y.crotch-0.04,Math.PI/2*sx)*0.5+tq(t,y.crotch-0.04,0)*0.5, kn=(tq(t,y.knee,0)+tq(t,y.knee,Math.PI/2))/2;
        const below=clamp((y.crotch-yy)/(y.crotch-y.ankle),0,1);
        if (leg) {}
        else if (wide) rt=Math.max(rt, thR*(1.06+0.12*below)+(it.fit==="over"?0.012:0));
        else if (short) rt=Math.max(rt, thR*1.12);
        else if (boot) rt=Math.max(rt, yy<y.knee ? lerp(kn+0.008,kn+0.03,clamp((y.knee-yy)/(y.knee-y.ankle),0,1)) : lerp(thR*0.98,kn+0.008,clamp((y.crotch-yy)/(y.crotch-y.knee),0,1)));
        else if (jog) rt=Math.max(rt, yy<y.knee ? lerp(kn+0.016, tq(t,y.ankle+0.03,0)+0.004, clamp((y.knee-yy)/(y.knee-y.ankle),0,1)) : lerp(thR*1.02,kn+0.016,clamp((y.crotch-yy)/(y.crotch-y.knee),0,1)));
        else if (straight) rt=Math.max(rt, yy<y.knee ? kn+0.016 : lerp(thR*1.0,kn+0.016,clamp((y.crotch-yy)/(y.crotch-y.knee),0,1)));
        else rt=Math.max(rt, yy<y.knee ? lerp(kn+0.012,kn*0.85,clamp((y.knee-yy)/(y.knee-y.ankle),0,1)) : lerp(thR,kn+0.012,clamp((y.crotch-yy)/(y.crotch-y.knee),0,1)));
        const blend=sstep(y.crotch+0.015,y.crotch-0.06,yy), rr=Math.max(r,lerp(r,rt,blend)); P[k*3]=cx+Math.sin(th)*rr; P[k*3+2]=cz+Math.cos(th)*rr; }
      ease[k]=(leg?0.0015:0.003)+eH*(leg?0.2:1); }
    const mat=clothMat(it), root=new T.Group(); root.add(finish(P,cm.idx,ease,mat,{smooth:2,hem:0.004}));
    if (!leg) root.add(ringAt(B,yW-0.014,0.004+eH,0.008,clothMat(it,shade(COLORS[it.color].h,-.08))));
    root.userData.ease=(leg?0.002:0.003+eH)+(leg?0:0.012);
    if (/카고/.test(nm)) for (const sx of [1,-1]){ const t=TB.legs[sx], yy=(y.crotch+y.knee)/2, [cx,cz]=tc(t,yy), r=tq(t,yy,Math.PI/2*sx); const pk=new T.Mesh(new T.BoxGeometry(0.02,0.15,0.13),mat); pk.position.set(cx+sx*(r*1.15+0.02),yy,cz); pk.castShadow=true; root.add(pk); }
    if (jog) for (const sx of [1,-1]){ const t=TB.legs[sx], yy=yHemL+0.02, [cx,cz]=tc(t,yy), r=(tq(t,yy,0)+tq(t,yy,Math.PI/2))/2+0.006; const cuff=new T.Mesh(new T.TorusGeometry(r,0.009,8,40),mat); cuff.rotation.x=Math.PI/2; cuff.position.set(cx,yy,cz); root.add(cuff); }
    return root; }

  function shoesLayer(B,p,it,root){ const {X}=B, R=D.reg, y=B.y, TB=tables(B), nm=it.name, sneaker=/스니커즈|러닝|캔버스/.test(nm), boot=/부츠/.test(nm), low=/플랫|펌프스|슬링백|메리제인|로퍼/.test(nm);
    const yTop = boot ? y.ankle+0.12 : low ? 0.045 : y.ankle-0.005, f=new Float32Array(D.nU).fill(-1);
    for (let i=0;i<D.nU;i++){ if (!D.isB[i] || R(i,"foot")+R(i,"lleg")<0.5) continue; f[i]=yTop-X[i*3+1]; }
    const cm=cutMesh(B,f), n=cm.P.length/3, P=cm.P, ease=new Float32Array(n), sole0=sneaker?0.022:0.01;
    for (let k=0;k<n;k++){ const x=P[k*3], yy=P[k*3+1], z=P[k*3+2], sx=x>0?1:-1, t=TB.feet[sx], [cx,cz]=tc(t,yy), th=Math.atan2(x-cx,z-cz), r=Math.hypot(x-cx,z-cz), rr=Math.max(r,tq(t,yy,th));
      P[k*3]=cx+Math.sin(th)*rr; P[k*3+2]=cz+Math.cos(th)*rr; P[k*3+1]=Math.max(yy, sole0*0.7); ease[k]=boot?0.008:0.006; }
    const mat=clothMat(it); root.add(finish(P,cm.idx,ease,mat,{smooth:4,smooth2:2,hem:0.003}));
    const soleM=basicMat(sneaker?"#F3F1EC":"#2A2420",{roughness:.7});
    for (const sx of [1,-1]){ const t=TB.feet[sx], [cx,cz]=tc(t,0.012), sh=new T.Shape();
      for (let a=0;a<=NA;a++){ const th=a/NA*Math.PI*2-Math.PI, r=tq(t,0.012,th)*1.06+0.004, px=cx+Math.sin(th)*r, pz=cz+Math.cos(th)*r; if (a===0) sh.moveTo(px,-pz); else sh.lineTo(px,-pz); }
      const g=new T.ExtrudeGeometry(sh,{depth:sole0,bevelEnabled:false,curveSegments:2}); g.rotateX(-Math.PI/2); const m=new T.Mesh(g,soleM); m.castShadow=true; m.receiveShadow=true; root.add(m);
      if (/메리제인/.test(nm)){ const yy=0.05, [ax,az]=tc(t,yy), r=tq(t,yy,Math.PI/2)+0.006; const st=new T.Mesh(new T.TorusGeometry(r,0.0035,6,24,Math.PI),mat); st.position.set(ax,yy,az+0.02); st.rotation.y=Math.PI/2; root.add(st); } } }

  function bagLayer(B,it,root){ const mat=clothMat(it), y=B.y, small=/미니|크로스/.test(it.name), cross=/크로스/.test(it.name), brief=/브리프|토트/.test(it.name);
    const w=small?0.17:0.32, h=small?0.12:0.25, d=small?0.06:0.1, aR=B.armR, aL=B.armL, TT=tables(B).torso;
    const b=new T.Mesh(new T.BoxGeometry(w,h,d,4,4,2),mat); b.castShadow=true;
    if (brief){ const hp=aR.w.clone(); b.position.set(hp.x-0.02,hp.y-0.1-h/2,hp.z+0.02); b.rotation.y=Math.PI/2; root.add(b);
      const hdl=new T.Mesh(new T.TorusGeometry(0.035,0.006,8,24,Math.PI),mat); hdl.position.set(hp.x-0.02,hp.y-0.1,hp.z+0.02); hdl.rotation.y=Math.PI/2; root.add(hdl); return; }
    const hipR=tq(TT,y.hip,Math.PI/2); b.position.set(hipR+d*0.5+0.06, y.hip+0.02, 0.0); b.rotation.y=Math.PI/2; b.rotation.z=0.06; root.add(b);
    const sh=aL.s, fz=tq(TT,y.bust,0)+0.02;
    const pts = cross ? [V3(-sh.x*0.8,sh.y+0.045,-0.01), V3(-0.04,y.bust+0.03,fz), V3(y.waist*0+0.08,y.waist,tq(TT,y.waist,0.4)+0.025), V3(hipR+0.05,y.hip+0.08,0.02)]
      : [V3(sh.x*0.85,sh.y+0.05,0.0), V3(sh.x+0.07,sh.y-0.05,0.02), V3(hipR+0.065,y.hip+0.02+h/2,0.0)];
    const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,0.0045,8,false),mat); tube.castShadow=true; root.add(tube); }

  /* ===== 착장 조립 ===== */
  function build(g, p, look, sizes){ const B=morph(g,p), root=new T.Group(), y=B.y;
    const sizeOf = it => (sizes && sizes[it.id]!=null) ? sizes[it.id] : ((recSize(it,p)||{}).idx ?? 2);
    root.add(bodyMesh(B,p)); eyes(B,root); hairLayer(B,p,root);
    const inner = {cat:"top",name:"이너 탑",color:"ivory",fit:"slim",shape:"top-s",id:"_in",g}, innerB={cat:"bottom",name:"이너 쇼츠",color:"gray",fit:"slim",shape:"pants-sh",id:"_ib",g};
    const cE = (it,G)=>clamp((G.chest-p.chest)/(2*Math.PI)/100*0.45,0.002,0.045);
    let topEase=0, botEase=0; const under={skirt:null,wide:false};
    const upper=(it,layer)=>{ const G=garment(it,sizeOf(it)), nm=it.name, isO=layer==="outer", isD=it.cat==="dress";
      let yHem; if (isD) yHem=y.waist-0.02;
      else if (isO) yHem = it.shape==="outer-l" ? y.hip-0.02 : (/숏|크롭/.test(nm) ? y.waist-0.01 : y.hip-0.06);
      else yHem = /크롭/.test(nm) ? y.waist+0.03 : it.fit==="over" ? y.hip-0.07 : y.hip-0.04;
      const L1=B.armL.L1, L2=B.armL.L2, longS=!(it.shape==="top-s" || (isD && !/니트/.test(nm)));
      const sleeve= longS ? L1+L2-(isO?0.0:0.012) : (isD? L1*0.32 : it.fit==="over"? L1*0.6 : L1*0.45);
      const neck = /브이넥|가디건/.test(nm) ? {front:0.04,v:0.12} : /하프넥|터틀/.test(nm) ? {front:-0.01,back:-0.025,up:0.0} : /셔츠|블라우스/.test(nm) ? {front:0.03,back:0.0,v:0.05} : isO ? {front:0.06,v:0.16,back:-0.005} : /후드|맨투맨/.test(nm)? {front:0.025}: {front:0.04};
      const drape = isO ? (it.fit==="over"?"over":"regular") : it.fit==="slim" ? "slim" : it.fit;
      let ease = cE(it,G) + (isO? topEase+0.012 : 0.004) + (/패딩|다운/.test(nm)?0.022:0) + (/니트|후드|맨투맨/.test(nm)?0.003:0);
      const sE = ({slim:0.005,regular:0.01,over:0.02})[it.fit]+(isO?topEase+0.01:0)+(/패딩|다운/.test(nm)?0.018:0);
      const closed=/패딩|다운|파카|바람막이|플리스/.test(nm);
      const open = isO && !closed ? [0.006,0.055] : (/가디건/.test(nm) ? null : null);
      const grp=new T.Group(); grp.add(topLike(B,p,it,{yHem,sleeve,neck,ease,sEase:sE,drape,open,layer,hipEase:botEase+(isO?0.016:0.007)}));
      if (!isO) topEase=ease;
      if (isD || (isO && it.shape==="outer-l")){
        const long=/롱|니트/.test(nm), yH = isD ? (long? y.knee-0.17 : y.knee-0.04) : y.knee+0.02;
        const flare = isD ? (/플라워/.test(nm)?0.5:/린넨/.test(nm)?0.22:0.06) : 0.08;
        const us=under.skirt, sEase = isD ? 0.006+cE(it,G)*0.4 : ease+0.012+(us?us.ease+0.004:0)+(under.wide?0.03:0.008), sFl = isD ? flare : Math.max(flare, us? us.flare*0.8+0.04 : 0);
        if (isD) under.skirt={flare,ease:sEase};
        grp.add(skirtLike(B,it,{yTop: isD? y.waist+0.01 : y.waist-0.01, yHem:yH, flare:sFl, ease:sEase, open: isO&&!closed?0.09:0}));
      }
      // 디테일
      const TT=tables(B).torso, fz=(yy,ex)=>{ const [cx,cz]=tc(TT,yy); return cz+tq(TT,yy,0)+ex; };
      if (/셔츠|블라우스/.test(nm) && !isO){ grp.add(collarBand(B,0.008,0.035,clothMat(it),{dy:-0.03,gap:0.28,flare:0.012}));
        const btn=basicMat("#F4F0EA",{roughness:.3,clearcoat:.8});
        for (let yy=y.neck-0.07; yy>Math.max(yHem,isD?y.waist:yHem)+0.03; yy-=0.07){ const b=new T.Mesh(new T.CylinderGeometry(0.0055,0.0055,0.003,16),btn); b.rotation.x=Math.PI/2; b.position.set(0,yy,fz(yy,ease+0.006)); grp.add(b); } }
      if (/가디건/.test(nm)){ const btn=basicMat("#FFF8EE",{roughness:.15,clearcoat:1});
        for (let yy=y.bust+0.02; yy>yHem+0.02; yy-=0.055){ const b=new T.Mesh(new T.SphereGeometry(0.0058,12,8),btn); b.scale.z=0.6; b.position.set(0,yy,fz(yy,ease+0.006)); grp.add(b);} }
      if (/리본/.test(nm)) for (const s of [-1,1]){ const r=new T.Mesh(new T.SphereGeometry(1,16,12),clothMat(it)); r.scale.set(0.028,0.014,0.007); r.position.set(s*0.024,y.neck-0.035,fz(y.neck-0.035,ease+0.012)); r.rotation.z=s*0.4; grp.add(r);
        const tail=new T.Mesh(new T.BoxGeometry(0.013,0.11,0.003),clothMat(it)); tail.position.set(s*0.012,y.neck-0.1,fz(y.neck-0.1,ease+0.012)); tail.rotation.z=s*0.12; grp.add(tail); }
      if (/후드/.test(nm)){ const n1=B.J["neck01"], hd=new T.Mesh(new T.SphereGeometry(1,24,16),clothMat(it)); hd.scale.set(0.12,0.075,0.07); hd.position.set(0,y.neck+0.005,n1.z-0.075); hd.castShadow=true; grp.add(hd);
        const trim=basicMat(shade(COLORS[it.color].h,-.12)); for (const s of [-1,1]){ const st=new T.Mesh(new T.CylinderGeometry(0.0025,0.0025,0.13,8),trim); st.position.set(s*0.03,y.neck-0.09,fz(y.neck-0.09,ease+0.006)); grp.add(st);} }
      if (/하프넥|터틀/.test(nm)){ grp.add(collarBand(B,0.008,0.05,clothMat(it),{dy:-0.03,flare:0.002})); }
      if (isO && !closed){ const btn=basicMat(/트위드/.test(nm)?"#D8B66A":shade(COLORS[it.color].h,-.4),{metalness:/트위드/.test(nm)?.8:0,roughness:.3});
        for (let yy=y.waist+0.04, i=0; yy>Math.max(yHem, y.hip-0.04)+0.02 && i<3; yy-=0.07, i++){ const b=new T.Mesh(new T.CylinderGeometry(0.008,0.008,0.004,16),btn); b.rotation.x=Math.PI/2; b.position.set(-0.03,yy,fz(yy,ease+0.004)); grp.add(b);} }
      if (/패딩|다운/.test(nm)) grp.add(neckRing(B,0.03,0.018,clothMat(it),-0.02));
      return grp; };
    const lower=it=>{ const G=garment(it,sizeOf(it));
      if (it.shape.startsWith("skirt")){ const nm=it.name, long=it.shape==="skirt-l", yH= long? y.knee-0.2 : y.crotch-0.07;
        const fl = /플리츠/.test(nm)?0.38 : /H라인/.test(nm)?0.02 : long?0.3 : 0.14;
        const se=0.004+clamp((G.hip-p.hip)/(2*Math.PI)/100*0.3,0,0.02); under.skirt={flare:fl,ease:se};
        const grp=new T.Group(); grp.add(skirtLike(B,it,{yTop:y.waist+0.01,yHem:yH,flare:fl,ease:se,pleat:/플리츠/.test(nm)?0.035:0}));
        grp.add(ringAt(B,y.waist+0.005,0.007,0.009,clothMat(it,shade(COLORS[it.color].h,-.08)))); grp.userData.ease=0.02; return grp; }
      under.wide = it.shape==='pants-w'; return pantsLayer(B,p,it,G); };
    if (look.dress) root.add(upper(look.dress,"dress"));
    else { const lo=lower(look.bottom||innerB); root.add(lo); botEase=lo.userData.ease||0.01; root.add(upper(look.top||inner,"top")); }
    if (look.outer) root.add(upper(look.outer,"outer"));
    if (look.shoes) shoesLayer(B,p,look.shoes,root);
    if (look.bag) bagLayer(B,look.bag,root);
    root.userData.H=p.height/100; return root; }

  /* ===== 렌더러 / 장면 ===== */
  function mkRenderer(){ const r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}); r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.NoToneMapping; r.physicallyCorrectLights=false; r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap; r.setClearColor(0x000000,0); return r; }
  function makeScene(r){ const sc=new T.Scene();
    if (T.RoomEnvironment){ const pm=new T.PMREMGenerator(r); sc.environment=pm.fromScene(new T.RoomEnvironment(),0.04).texture; pm.dispose(); }
    sc.add(new T.HemisphereLight(0xfffaf6,0xb9aca4,0.3));
    const key=new T.DirectionalLight(0xfff1e8,0.82); key.position.set(1.3,3.2,2.8); key.castShadow=true; key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-0.9,right:0.9,top:2.2,bottom:-0.1,near:0.5,far:8}); key.shadow.bias=-0.0004; key.shadow.normalBias=0.012; key.shadow.radius=4; sc.add(key);
    const rim=new T.DirectionalLight(0xfff0f4,0.42); rim.position.set(-2,2.6,-2.4); sc.add(rim);
    const fill=new T.DirectionalLight(0xf2f5ff,0.2); fill.position.set(-2.2,1.3,2.2); sc.add(fill);
    const ground=new T.Mesh(new T.CircleGeometry(1.6,64), new T.ShadowMaterial({opacity:.16})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; sc.add(ground);
    return sc; }
  function frame(cam, H, aspect, theta, zoom){ cam.aspect=aspect; const f=Math.tan(cam.fov*Math.PI/360);
    const dist=Math.max((H*1.08/2)/f, (0.78/2)/(f*aspect))/(zoom||1); const ty=H*0.5;
    cam.position.set(Math.sin(theta)*dist, ty+H*0.03, Math.cos(theta)*dist); cam.lookAt(0,ty,0); cam.updateProjectionMatrix(); return {dist,ty}; }
  function disposeTree(o){ o.traverse(n=>{ if (n.geometry) n.geometry.dispose(); if (n.material) (Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{ if (m.map && !Object.values(texCache).includes(m.map) && !(skinTex && (m.map===skinTex.F||m.map===skinTex.M)) && m.map!==eyeTex) m.map.dispose(); m.dispose(); }); }); }

  // 라이브(회전 가능) 뷰 — 한 번에 하나
  let L=null;
  function ensureLive(){ if (L) return L;
    const r=mkRenderer(), sc=makeScene(r), cam=new T.PerspectiveCamera(24,1,0.05,30);
    const ctl=T.OrbitControls?new T.OrbitControls(cam,r.domElement):null;
    if (ctl){ Object.assign(ctl,{enablePan:false,enableDamping:true,dampingFactor:.08,minPolarAngle:Math.PI*0.3,maxPolarAngle:Math.PI*0.58,rotateSpeed:.7,autoRotateSpeed:2.2}); }
    L={r,sc,cam,ctl,fig:null,host:null,dirty:true};
    if (ctl) ctl.addEventListener("change",()=>{ L.dirty=true; });
    const loop=()=>{ requestAnimationFrame(loop); if (!L.host||!L.host.isConnected) return; if (ctl) ctl.update(); if (L.dirty||ctl&&ctl.autoRotate){ r.render(sc,cam); L.dirty=false; } };
    loop(); window.addEventListener("resize",()=>{ if (L.host&&L.host.isConnected) sizeLive(); }); return L; }
  function sizeLive(){ const el=L.stage||L.host, w=el.clientWidth||300, h=el.clientHeight||400; L.r.setPixelRatio(Math.min(2,window.devicePixelRatio||1)); L.r.setSize(w,h,false); L.cam.aspect=w/h; L.cam.updateProjectionMatrix(); L.dirty=true; }
  function setFig(cfg, reframe){ if (L.fig){ L.sc.remove(L.fig); disposeTree(L.fig); }
    L.fig=build(cfg.g,cfg.p,cfg.look||{},cfg.sizes||{}); L.sc.add(L.fig); L.cfg=cfg;
    if (reframe){ const H=cfg.p.height/100, {ty}=frame(L.cam,H,L.cam.aspect,cfg.theta??0.28); if (L.ctl){ L.ctl.target.set(0,ty,0); L.ctl.minDistance=L.cam.position.length()*0.35; L.ctl.maxDistance=L.cam.position.length()*1.4; L.ctl.update(); } }
    L.dirty=true; }
  function view(theta){ if (!L||!L.ctl) return; const t=L.ctl.target, d=L.cam.position.distanceTo(t); L.cam.position.set(t.x+Math.sin(theta)*d, t.y+L.cfg.p.height/100*0.03, t.z+Math.cos(theta)*d); L.ctl.update(); L.dirty=true;
    if (L.host) L.host.querySelectorAll("[data-fview]").forEach(b=>b.setAttribute("aria-pressed", Math.abs(+b.dataset.fview-theta)<0.01)); }
  function mountLive(host, cfg, opts={}){ host.innerHTML=`<div class="fload"></div>`;
    load().then(()=>{ if (!host.isConnected) return; const l=ensureLive(); l.host=host; host.innerHTML="";
      const st=document.createElement("div"); st.className="fstage"; st.appendChild(l.r.domElement); host.appendChild(st); l.stage=st;
      const fb=document.createElement("div"); fb.className="fbar";
      fb.innerHTML=`<span class="fbadge">3D 실사 바디 · ${cfg.p.height}cm · 드래그 360°</span><div class="fctl"><button data-fview="0" aria-pressed="false">정면</button><button data-fview="1.5708" aria-pressed="false">측면</button><button data-fview="3.1416" aria-pressed="false">후면</button><button data-fspin aria-pressed="${!!(l.ctl&&l.ctl.autoRotate)}">회전</button></div>`;
      host.appendChild(fb);
      sizeLive(); setFig(cfg,true); }).catch(()=>{ host.innerHTML=cfg.fb||""; }); }
  function update(cfg){ if (!D||!L||!L.host||!L.host.isConnected) return false; setFig(Object.assign({},L.cfg,cfg), false); return true; }
  document.addEventListener("click", e=>{ const b=e.target.closest("[data-fview],[data-fspin]"); if (!b||!L) return; e.stopPropagation();
    if (b.dataset.fview!==undefined){ if (L.ctl) L.ctl.autoRotate=false; const sp=L.host&&L.host.querySelector("[data-fspin]"); if (sp) sp.setAttribute("aria-pressed","false"); view(+b.dataset.fview); }
    else if (L.ctl){ L.ctl.autoRotate=!L.ctl.autoRotate; b.setAttribute("aria-pressed",L.ctl.autoRotate); } }, true);

  // 스냅샷(이미지) — 카드·코디·상세용
  let Sn=null; const cache=new Map(); let q=[], busy=false;
  const lookKey=cfg=>[cfg.g,bodyKey(cfg.p),["skin","hair","hairColor"].map(k=>cfg.p[k]).join(","),Object.values(cfg.look||{}).map(i=>i.id).join(","),JSON.stringify(cfg.sizes||{})].join("#");
  function snapshot(cfg, w, h, theta){ const key=[lookKey(cfg),w,h,theta,JSON.stringify(cfg.cam||0)].join("#");
    if (cache.has(key)) return cache.get(key);
    if (!Sn){ const r=mkRenderer(); Sn={r,sc:makeScene(r),cam:new T.PerspectiveCamera(24,1,0.05,30)}; }
    Sn.r.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1)); Sn.r.setSize(w,h,false);
    const f=build(cfg.g,cfg.p,cfg.look||{},cfg.sizes||{}); Sn.sc.add(f); frame(Sn.cam,cfg.p.height/100,w/h,theta);
    if (cfg.cam){ const c=cfg.cam; Sn.cam.position.set(Math.sin(theta)*c.d, c.y, Math.cos(theta)*c.d); Sn.cam.lookAt(0,c.y,0); }
    Sn.r.render(Sn.sc,Sn.cam); const url=Sn.r.domElement.toDataURL("image/png"); Sn.sc.remove(f); disposeTree(f);
    if (cache.size>160) cache.delete(cache.keys().next().value); cache.set(key,url); return url; }
  function pump(){ if (!q.length){ busy=false; return; } busy=true; const j=q.shift();
    if (j.el.isConnected){ try { j.el.innerHTML=`<img alt="3D 착용 이미지" src="${snapshot(j.cfg,j.o.w||300,j.o.h||420,j.o.theta??0.3)}">`; } catch(err){ console.error(err); j.el.innerHTML=j.fallback; } }
    setTimeout(pump,12); }
  function queueSnap(el,cfg,o,fallback){ q.push({el,cfg,o,fallback}); if (!busy){ busy=true; load().then(()=>setTimeout(pump,0)).catch(()=>{ for (const j of q) j.el.innerHTML=j.fallback; q=[]; busy=false; }); } }
  function render(cfg,w,h,theta){ return load().then(()=>snapshot(cfg,w,h,theta)); }
  return {ok, mountLive, update, queueSnap, view, render, load, _morph:(g,p)=>morph(g,p)};
})();
