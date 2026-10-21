# OTJAL body export — Rat Rae Choi
import pickle, numpy as np, json, zlib, base64, struct
d=pickle.load(open('/home/claude/mh/out/stage1.pkl','rb'))
J=d['joints']; NV=len(d['V'])
JN=['upperarm01.L','upperarm01.R','lowerarm01.L','lowerarm01.R','wrist.L','wrist.R','upperleg01.L','upperleg01.R','lowerleg01.L','lowerleg01.R','foot.L','foot.R','neck01','neck02','head','eye.L','eye.R','spine03','spine01','root','clavicle.L','clavicle.R','shoulder01.L','shoulder01.R']
jverts=sorted({v for n in JN for v in J[n+'____head']})
used=list(d['used']); extra=[v for v in jverts if d['remap'][v]<0]
allv=np.array(used+extra); remap=-np.ones(NV,int); remap[allv]=np.arange(len(allv))
# pv: expanded -> original vertex; original remap applied for 'used' only, extra appended at end (same order) so indices stay valid
pv=d['pv']  # indexes into used ordering (0..len(used)-1)
assert pv.max() < len(used)
NU=len(allv)
M=lambda X: X[allv]*0.1   # dm -> m
chunks=[]; hdr={'nU':NU,'nE':len(pv),'nT':len(d['tri'])//3,'groups':{k:[a//3,b//3] for k,(a,b) in d['grp_ranges'].items()},'regions':d['names'],'arrays':[]}
def add(name, arr, dtype):
    a=np.ascontiguousarray(arr.astype(dtype)); off=sum(len(c) for c in chunks)
    pad=(-off)%8
    if pad: chunks.append(b'\0'*pad); off+=pad
    chunks.append(a.tobytes()); hdr['arrays'].append([name,str(np.dtype(dtype)),off,a.size])
add('pv',pv,np.uint16)
uv=d['puv']; add('uv',np.round(np.clip(uv,0,1)*65535),np.uint16)
add('tri',np.array(d['tri']),np.uint16)
reg=d['region'][allv].copy(); add('region',reg,np.uint8)
from collections import defaultdict
sk=__import__('json').load(open('/home/claude/mh/makehuman/data/rigs/default.mhskel'))
Wt=__import__('json').load(open('/home/claude/mh/makehuman/data/rigs/default_weights.mhw'))['weights']
ch=defaultdict(list)
for b,i in sk['bones'].items(): ch[i['parent']].append(b)
def sub(b): return [b]+[x for c in ch[b] for x in sub(c)]
def ws(bl):
    w=np.zeros(NV)
    for b in bl:
        for vi,ww in Wt.get(b,[]): w[vi]+=ww
    return np.clip(w,0,1)
wA=np.maximum(ws(sub('upperarm01.L')),ws(sub('upperarm01.R')))
wF=np.maximum(ws(sub('lowerarm01.L')),ws(sub('lowerarm01.R')))
wS=np.maximum(ws(['shoulder01.L','clavicle.L']),ws(['shoulder01.R','clavicle.R']))
# torso/leg helpers: thigh split weights
wG=np.maximum(ws(sub('upperleg01.L')),ws(sub('upperleg01.R')))
add('wG',np.round(wG[allv]*255),np.uint8); add('wA',np.round(wA[allv]*255),np.uint8); add('wF',np.round(wF[allv]*255),np.uint8); add('wS',np.round(wS[allv]*255),np.uint8)
# all region weights (for smooth garment masks)
RW=d['RW'][allv]; RW=RW/np.maximum(RW.sum(1,keepdims=True),1e-6)
add('rw',np.round(RW*255),np.uint8)
hdr['joints']={n:[int(remap[v]) for v in J[n+'____head']] for n in JN}
hdr['meas']={k:[int(remap[v]) for v in d['MEAS'][k]] for k in d['MK']}
assert all(min(v)>=0 for v in hdr['meas'].values())
bodyv=d['bodyv']; bodyU=remap[bodyv]

def meas(X):
    r={k:float(np.linalg.norm(np.diff(X[d['MEAS'][k]],axis=0),axis=1).sum()) for k in d['MK']}
    r['height']=float(X[bodyv,1].max()-X[bodyv,1].min()); return r   # metres when X in m

def addShape(name, delta):
    dm=M(delta) if delta.shape[0]==NV else delta
    mag=np.abs(dm).max(1); idx=np.nonzero(mag>0.0002)[0]
    if not len(idx): return None
    sc=float(np.abs(dm[idx]).max()/127)
    add(name+'.i',idx,np.uint16); add(name+'.d',np.round(dm[idx]/sc),np.int8)
    return sc
hdr['gender']={}
for G,gd in d['genders'].items():
    B=gd['base']; add(G+'.base',np.round(M(B)/1e-4),np.int16)
    m0=meas(M(B)); info={'m0':m0,'shapes':{}}
    allsh=dict(gd['shapes']); allsh.update(d['shared'])
    for sname,delta in allsh.items():
        key=G+'.'+sname; sc=addShape(key,delta)
        if sc is None: continue
        m1=meas(M(B+delta)); info['shapes'][sname]={'sc':sc,'dm':{k:round(m1[k]-m0[k],6) for k in m0}}
    hdr['gender'][G]=info
    print(G, {k:round(v*100,1) for k,v in m0.items()})
blob=b''.join(chunks)
hj=json.dumps(hdr,separators=(',',':')).encode()
full=struct.pack('<I',len(hj))+hj+b'\0'*((-len(hj)-4)%8)+blob
z=zlib.compress(full,9)
print('raw',len(full),'deflate',len(z),'b64',len(base64.b64encode(z)))
open('/home/claude/mh/out/body.bin','wb').write(full)
open('/home/claude/mh/out/body.z','wb').write(z)
