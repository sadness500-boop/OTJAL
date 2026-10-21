# OTJAL body pipeline — MakeHuman CC0 assets -> compact morphable mesh data
# Rat Rae Choi
import json, re, numpy as np, os, collections, zlib, base64, sys
D = '/home/claude/mh/makehuman/data/'
OUT = '/home/claude/mh/out/'; os.makedirs(OUT, exist_ok=True)

# ---------- OBJ ----------
V=[]; VT=[]; faces=collections.defaultdict(list); g=None
for line in open(D+'3dobjs/base.obj'):
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('g '): g=line.split()[1]
    elif line.startswith('f '):
        faces[g].append([tuple(int(a)-1 for a in t.split('/')[:2]) for t in line.split()[1:]])
V=np.array(V); VT=np.array(VT); NV=len(V)

def target(path):
    d=np.zeros((NV,3))
    for line in open(D+'targets/'+path):
        if line.startswith('#') or not line.strip(): continue
        a=line.split(); d[int(a[0])]=[float(a[1]),float(a[2]),float(a[3])]
    return d

KEEP = ['body','helper-l-eye','helper-r-eye','helper-l-eyelashes-1','helper-l-eyelashes-2','helper-r-eyelashes-1','helper-r-eyelashes-2']
used = sorted({v for gname in KEEP for f in faces[gname] for v,_ in f})
remap = -np.ones(NV,int); remap[used]=np.arange(len(used))
# expanded (vertex,uv) pairs
pairs={}; pv=[]; puv=[]; tri=[]; grp_ranges={}
def P(v,t):
    k=(v,t)
    if k not in pairs: pairs[k]=len(pv); pv.append(remap[v]); puv.append(t)
    return pairs[k]
for gname in KEEP:
    s=len(tri)
    for f in faces[gname]:
        ids=[P(v,t) for v,t in f]
        if len(ids)==4: tri += [ids[0],ids[1],ids[2], ids[0],ids[2],ids[3]]
        else: tri += ids[:3]
    grp_ranges[gname]=(s,len(tri))
pv=np.array(pv); puv=VT[np.array(puv)]
print('used verts',len(used),'expanded',len(pv),'tris',len(tri)//3, grp_ranges)

# ---------- skeleton & weights ----------
sk=json.load(open(D+'rigs/default.mhskel')); W=json.load(open(D+'rigs/default_weights.mhw'))['weights']
bones=sk['bones']; joints=sk['joints']
children=collections.defaultdict(list)
for b,info in bones.items(): children[info['parent']].append(b)
def subtree(b):
    out=[b]
    for c in children[b]: out+=subtree(c)
    return out
def wsum(blist):
    w=np.zeros(NV)
    for b in blist:
        for vi,ww in W.get(b,[]): w[vi]+=ww
    return w
REG = {
 'torso': ['root','spine05','spine04','spine03','spine02','spine01','breast.L','breast.R','pelvis.L','pelvis.R','clavicle.L','clavicle.R','shoulder01.L','shoulder01.R','neck01'],
 'head':  subtree('neck02'),
 'uarm':  ['upperarm01.L','upperarm01.R','upperarm02.L','upperarm02.R'],
 'larm':  ['lowerarm01.L','lowerarm01.R','lowerarm02.L','lowerarm02.R'],
 'hand':  subtree('wrist.L')+subtree('wrist.R'),
 'uleg':  ['upperleg01.L','upperleg01.R','upperleg02.L','upperleg02.R'],
 'lleg':  ['lowerleg01.L','lowerleg01.R','lowerleg02.L','lowerleg02.R'],
 'foot':  subtree('foot.L')+subtree('foot.R'),
}
names=list(REG); RW=np.stack([wsum(REG[k]) for k in names],1)
region=RW.argmax(1).astype(np.uint8)
print('regions', {k:int((region[used]==i).sum()) for i,k in enumerate(names)})
armL=wsum(subtree('upperarm01.L')); armR=wsum(subtree('upperarm01.R'))
shL=wsum(['shoulder01.L']); shR=wsum(['shoulder01.R'])
def J(name): return joints[name]

# ---------- shapes ----------
def U(gd,mus,wt): return target(f'macrodetails/universal-{gd}-young-{mus}muscle-{wt}weight.target')
out={'regions':names,'shapes':{},'genders':{}}
shared={}
for m in ['bust-circ','underbust-circ','waist-circ','hips-circ','thigh-circ','calf-circ','upperarm-circ','shoulder-dist','upperleg-height','lowerleg-height','upperarm-length','lowerarm-length','neck-circ','napetowaist-dist']:
    shared[m+'+']=target(f'measure/measure-{m}-incr.target'); shared[m+'-']=target(f'measure/measure-{m}-decr.target')

src=open('/home/claude/mh/ruler_full.py').read()
MEAS={k:[int(x) for x in v.split(',')] for k,v in re.findall(r"Measures\['measure/measure-([a-z-]+)-decr\|incr'\]\s*=\s*\[([0-9,\s]+)\]",src)}
print('measures', list(MEAS))
def measure(X, k):
    idx=MEAS[k]; p=X[idx]; return float(np.linalg.norm(np.diff(p,axis=0),axis=1).sum())*10  # cm
bodyv=np.array(sorted({v for f in faces['body'] for v,_ in f}))
def height(X): return (X[bodyv,1].max()-X[bodyv,1].min())*10
MK=['bust-circ','underbust-circ','waist-circ','hips-circ','thigh-circ','calf-circ','upperarm-circ','shoulder-dist','upperleg-height','lowerleg-height','upperarm-length','lowerarm-length','neck-circ']

for gd,G in [('female','F'),('male','M')]:
    base = V + U(gd,'average','average') + 0.7*target(f'macrodetails/asian-{gd}-young.target') + 0.3*target(f'macrodetails/caucasian-{gd}-young.target')
    sh = {}
    sh['weight+']=U(gd,'average','max')-U(gd,'average','average')
    sh['weight-']=U(gd,'average','min')-U(gd,'average','average')
    sh['muscle+']=U(gd,'max','average')-U(gd,'average','average')
    sh['muscle-']=U(gd,'min','average')-U(gd,'average','average')
    sh['height+']=target(f'macrodetails/height/{gd}-young-averagemuscle-averageweight-maxheight.target')
    sh['height-']=target(f'macrodetails/height/{gd}-young-averagemuscle-averageweight-minheight.target')
    if gd=='female':
        sh['cup+']=target('breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target')
        sh['cup-']=target('breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target')
    out['genders'][G]={'base':base,'shapes':sh}

# joint positions / pose info
def jpos(X,name): return X[J(name)].mean(0)
for G,gd in out['genders'].items():
    X=gd['base']
    sL=jpos(X,'upperarm01.L____head'); eL=jpos(X,'lowerarm01.L____head'); wL=jpos(X,'wrist.L____head')
    v=wL-sL; ang=np.degrees(np.arctan2(v[0],-v[1]))
    print(G,'height cm',round(height(X),1),'arm angle from vertical',round(ang,1),'shoulderL',sL.round(3),'wrist',wL.round(3))
    print('  measures', {k:round(measure(X,k),1) for k in MK})

np.save(OUT+'stage1.npy', np.array([0]))
import pickle
pickle.dump(dict(V=V,VT=VT,faces=faces,used=used,remap=remap,pv=pv,puv=puv,tri=tri,grp_ranges=grp_ranges,region=region,names=names,armL=armL,armR=armR,shL=shL,shR=shR,joints=joints,genders=out['genders'],shared=shared,MEAS=MEAS,MK=MK,bodyv=bodyv,RW=RW),open(OUT+'stage1.pkl','wb'))
