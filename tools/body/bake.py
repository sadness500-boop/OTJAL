# OTJAL skin texture bake (procedural, from MakeHuman CC0 mesh) — Rat Rae Choi
import pickle, numpy as np, cv2, numba, base64, sys
d=pickle.load(open('/home/claude/mh/out/stage1.pkl','rb'))
S=int(sys.argv[1]) if len(sys.argv)>1 else 1024
tri=np.array(d['tri']).reshape(-1,3); b0,b1=d['grp_ranges']['body']; BT=tri[b0//3:b1//3]
pv=np.array(d['pv']); used=np.array(d['used']); uv=d['puv']
faces=d['faces']; J=d['joints']

@numba.njit(cache=True)
def zbuf_pass(P2, Z, T, R):
    zb=np.full((R,R),-1e9)
    for t in range(T.shape[0]):
        a,b,c=T[t,0],T[t,1],T[t,2]
        x0,y0=P2[a,0],P2[a,1]; x1,y1=P2[b,0],P2[b,1]; x2,y2=P2[c,0],P2[c,1]
        mnx=max(0,int(min(x0,x1,x2))); mxx=min(R-1,int(max(x0,x1,x2))+1)
        mny=max(0,int(min(y0,y1,y2))); mxy=min(R-1,int(max(y0,y1,y2))+1)
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<1e-12: continue
        for yy in range(mny,mxy+1):
            for xx in range(mnx,mxx+1):
                px=xx+0.5; py=yy+0.5
                w0=((y1-y2)*(px-x2)+(x2-x1)*(py-y2))/den
                w1=((y2-y0)*(px-x2)+(x0-x2)*(py-y2))/den
                w2=1-w0-w1
                if w0<-1e-4 or w1<-1e-4 or w2<-1e-4: continue
                z=w0*Z[a]+w1*Z[b]+w2*Z[c]
                if z>zb[yy,xx]: zb[yy,xx]=z
    return zb

def vertex_ao(X, T, N, ndir=160, R=768):
    rng=np.random.default_rng(3); dirs=rng.normal(size=(ndir,3)); dirs/=np.linalg.norm(dirs,axis=1,keepdims=True)
    lo=X.min(0); hi=X.max(0); ext=(hi-lo).max()*1.05; ctr=(lo+hi)/2
    acc=np.zeros(len(X)); wsum=np.zeros(len(X))
    for dv in dirs:
        up=np.array([0,1,0]) if abs(dv[1])<0.9 else np.array([1,0,0])
        u=np.cross(up,dv); u/=np.linalg.norm(u); v=np.cross(dv,u)
        Q=X-ctr; P2=np.stack([(Q@u/ext+0.5)*R,(Q@v/ext+0.5)*R],1); Z=Q@dv
        zb=zbuf_pass(P2,Z,T,R)
        ix=np.clip(P2[:,0].astype(int),0,R-1); iy=np.clip(P2[:,1].astype(int),0,R-1)
        # 주변 픽셀 최댓값과 비교 (자기 가림 방지 여유)
        vis=(Z>=zb[iy,ix]-ext/R*2.5).astype(float)
        w=np.maximum(0,N@dv); acc+=vis*w; wsum+=w
    return acc/np.maximum(wsum,1e-6)

@numba.njit(cache=True)
def raster_uv(UVp, T, A, R):
    # A: per-vertex attributes (n, k) -> image (R,R,k), mask
    k=A.shape[1]; img=np.zeros((R,R,k)); msk=np.zeros((R,R),np.uint8)
    for t in range(T.shape[0]):
        a,b,c=T[t,0],T[t,1],T[t,2]
        x0,y0=UVp[a,0],UVp[a,1]; x1,y1=UVp[b,0],UVp[b,1]; x2,y2=UVp[c,0],UVp[c,1]
        mnx=max(0,int(min(x0,x1,x2))-1); mxx=min(R-1,int(max(x0,x1,x2))+1)
        mny=max(0,int(min(y0,y1,y2))-1); mxy=min(R-1,int(max(y0,y1,y2))+1)
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<1e-14: continue
        for yy in range(mny,mxy+1):
            for xx in range(mnx,mxx+1):
                px=xx+0.5; py=yy+0.5
                w0=((y1-y2)*(px-x2)+(x2-x1)*(py-y2))/den
                w1=((y2-y0)*(px-x2)+(x0-x2)*(py-y2))/den
                w2=1-w0-w1
                if w0<-0.02 or w1<-0.02 or w2<-0.02: continue
                for q in range(k): img[yy,xx,q]=w0*A[a,q]+w1*A[b,q]+w2*A[c,q]
                msk[yy,xx]=1
    return img,msk

def vnormals(X,T):
    N=np.zeros_like(X); f=np.cross(X[T[:,1]]-X[T[:,0]],X[T[:,2]]-X[T[:,0]])
    for k in range(3): np.add.at(N,T[:,k],f)
    return N/np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)

def sstep(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)

def bake(G):
    Xall=d['genders'][G]['base']*0.1   # metres
    X=Xall[used]
    T=pv[BT]            # body tris in used-index space
    N=vnormals(X,T)
    ao=vertex_ao(X,T,N)
    # 랜드마크
    jp=lambda n: Xall[J[n+'____head']].mean(0)
    eL=jp('eye.L'); eR=jp('eye.R')
    tu=sorted({v for f in faces['helper-upper-teeth'] for v,_ in f}); tl=sorted({v for f in faces['helper-lower-teeth'] for v,_ in f})
    mouthY=(Xall[tu,1].min()+Xall[tl,1].max())/2; mouthZ=Xall[tu+tl,2].max()
    eyeV=sorted({v for f in faces['helper-l-eye'] for v,_ in f}); er=np.linalg.norm(Xall[eyeV]-eL,axis=1).mean()
    wrist=[jp('wrist.L'),jp('wrist.R')]
    reg=d['region'][used]; head=(reg==d['names'].index('head')); hand=(reg==d['names'].index('hand'))
    # 텍셀별 3D 위치·노멀·AO
    A=np.concatenate([X,N,ao[:,None],head[:,None].astype(float),hand[:,None].astype(float)],1)
    UVp=np.stack([uv[:,0]*S,(1-uv[:,1])*S],1)
    # 확장 정점(UV 이음매) -> used index 로 attribute 매핑
    Ae=A[pv]; Te=BT
    img,msk=raster_uv(UVp,Te,Ae,S)
    P=img[...,0:3]; Nn=img[...,3:6]; AO=img[...,6]; H=img[...,7]; HD=img[...,8]
    x,y,z=P[...,0],P[...,1],P[...,2]
    # 기본 피부색 (선형이 아닌 sRGB 기준 0~1)
    base=np.array([0.925,0.80,0.725])
    rng=np.random.default_rng(7)
    def noise(scale, amp):
        n=rng.normal(size=(S//scale+2,S//scale+2)); n=cv2.resize(n,(S,S),interpolation=cv2.INTER_CUBIC); n=cv2.GaussianBlur(n,(0,0),scale*0.6); return n/ (n.std()+1e-6)*amp
    col=np.ones((S,S,3))*base
    mott=noise(24,0.018)+noise(6,0.008)
    col*= (1+mott[...,None]*np.array([1.0,0.8,0.7]))
    red=np.array([0.98,0.70,0.66])
    def mix(m, c, a=1.0):
        nonlocal col; m=np.clip(m,0,1)[...,None]*a; col=col*(1-m)+np.array(c)*m
    # 얼굴 앞면 마스크
    front=(Nn[...,2]>-0.2)&(H>0.5)
    # 볼 홍조
    for e in (eL,eR):
        cx=e[0]*1.15; cy=e[1]-0.032
        m=np.exp(-(((x-cx)/0.022)**2+((y-cy)/0.016)**2))*front
        mix(m, (0.93,0.62,0.60), 0.32 if G=='F' else 0.12)
    # 코끝·귀 약간 붉게
    m=np.exp(-((x/0.012)**2+((y-(mouthY+0.03))/0.014)**2))*front*(z>mouthZ+0.005); mix(m,(0.9,0.66,0.62),0.15)
    if G=='M':
        bm=front*sstep(mouthY+0.012,mouthY-0.005,y)*sstep(mouthY-0.075,mouthY-0.05,y)*sstep(0.075,0.05,np.abs(x))*(1-sstep(0.0,0.012,np.abs(y-mouthY))*sstep(0.03,0.02,np.abs(x)))
        mix(bm,(0.62,0.58,0.56),0.22)
    # 입술
    xm=0.0235 if G=='F' else 0.025
    ux=np.clip(np.abs(x)/xm,0,1.5)
    upper=0.0072*np.sqrt(np.clip(1-ux**2,0,1))*(1-0.25*np.exp(-(x/0.004)**2))+0.0012*np.exp(-((np.abs(x)-0.006)/0.004)**2)
    lower=0.0095*np.power(np.clip(1-(np.abs(x)/(xm*0.92))**2,0,1),0.6)
    dy=y-mouthY
    lipm=np.where(dy>=0, sstep(upper+0.0009,upper-0.0009,dy), sstep(-lower-0.0011,-lower+0.0011,dy))
    lipm=lipm*(z>mouthZ-0.012)*(H>0.5)*(Nn[...,2]>0.0)*sstep(1.08,0.96,ux)
    lipc=(0.80,0.42,0.45) if G=='F' else (0.76,0.52,0.50)
    mix(lipm, lipc, 0.82 if G=='F' else 0.55)
    mix(lipm*sstep(0.0012,0.0,np.abs(dy))*sstep(1.0,0.8,ux), (0.5,0.27,0.27), 0.5)   # 입술 사이 선
    # 눈썹
    for e,s in ((eL,1),(eR,-1)):
        lx=(x-e[0])*s   # +: 바깥쪽
        t=np.clip((lx+0.020)/0.046,0,1)
        by=e[1]+0.019+0.006*np.sin(np.clip(t,0,1)*np.pi*0.85)-0.004*t
        th=(0.0034*(1-t)+0.0012*t) if G=='F' else (0.0046*(1-t)+0.0022*t)
        dist=np.abs(y-by)
        m=sstep(th+0.0016,th-0.0008,dist)*((lx>-0.022)&(lx<0.029))*front*sstep(-0.022,-0.016,lx)*sstep(0.029,0.02,lx)
        strokes=0.55+0.45*np.clip(noise(1,1.0)*0.5+0.5,0,1)
        mix(m*strokes,(0.30,0.21,0.17),0.72 if G=='F' else 0.8)
        # 속눈썹 라인 / 쌍꺼풀 음영
        rr=np.sqrt((x-e[0])**2+(y-e[1])**2+(z-e[2])**2)
        lash=sstep(er*1.3,er*1.08,rr)*(y>e[1]-0.0015)*front*sstep(-0.004,0.004,z-(e[2]+er*0.4))
        mix(lash,(0.22,0.15,0.13),0.45)
        crease=np.exp(-(((rr-er*1.75)/(er*0.22))**2))*(y>e[1]+0.002)*front
        mix(crease,(0.70,0.52,0.47),0.28)
        low=sstep(er*1.35,er*1.1,rr)*(y<e[1]-0.001)*front
        mix(low,(0.62,0.45,0.42),0.25)
    # 손톱
    for w in wrist:
        dist=np.sqrt(((P-w)**2).sum(-1))
        nail=(HD>0.5)*sstep(0.150,0.168,dist)*(Nn[...,1]>0.35)
        mix(nail,(0.97,0.86,0.84),0.55)
    # AO
    aoc=np.clip(AO,0,1); aoc=0.55+0.45*np.power(aoc,0.8)
    col*=aoc[...,None]*np.array([1,0.97,0.96])+ (1-aoc[...,None])*np.array([0.0,0,0])
    out=np.clip(col,0,1)
    out=(out*255).astype(np.uint8)[...,::-1].copy()
    # 이음매 확장(dilate)
    m=msk.astype(np.uint8)
    for i in range(12):
        dil=cv2.dilate(out,np.ones((3,3),np.uint8)); dm=cv2.dilate(m,np.ones((3,3),np.uint8))
        grow=(dm>0)&(m==0); out[grow]=dil[grow]; m=dm
    out[m==0]=out[m>0].mean(0).astype(np.uint8)
    return out, base

for G in ['F','M']:
    img,base=bake(G)
    cv2.imwrite(f'/home/claude/mh/out/skin_{G}.png',img)
    ok,jpg=cv2.imencode('.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,84])
    open(f'/home/claude/mh/out/skin_{G}.jpg','wb').write(jpg.tobytes()); print(G,len(jpg))
open('/home/claude/mh/out/skin.txt','w').write('|'.join('data:image/jpeg;base64,'+base64.b64encode(open(f'/home/claude/mh/out/skin_{G}.jpg','rb').read()).decode() for G in ['F','M']))
