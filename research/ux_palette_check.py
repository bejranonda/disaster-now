# The UX scout's colour check (docs/research/ux-scout-2026-10-23.md §5a), re-run on the palette public/css/app.css ships.
#   python3 -I research/ux_palette_check.py
# Colour-vision check of the proposed level palette: Machado et al. 2009 (severity 1.0) simulation in linear RGB,
# CIEDE2000 differences between every pair of levels, and WCAG 2 contrast of the label text on each fill.
import math, itertools
P = {  # level: (fill, text)
 'L1 ยังไม่น่าห่วง': ('#2F6FB0', '#FFFFFF'),
 'L2 ติดตามไว้':       ('#F2E700', '#2E2A00'),
 'L3 เตรียมตัว':      ('#E46C0A', '#1F1300'),  # the palette shipped (the scout's first try was #EE7A12)
 'L4 ทำทันที':        ('#B3122E', '#FFFFFF'),
 'ND ไม่มีข้อมูล':     ('#9AA3AE', '#111827'),
}
M = {
 'normal': [[1,0,0],[0,1,0],[0,0,1]],
 'protan': [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
 'deutan': [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
 'tritan': [[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
}
def hex2(c): c=c.lstrip('#'); return [int(c[i:i+2],16)/255 for i in (0,2,4)]
def lin(v): return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def sim(c,m):
    l=[lin(x) for x in hex2(c)]; o=[sum(m[i][j]*l[j] for j in range(3)) for i in range(3)]
    return [min(1,max(0,x)) for x in o]
def lab(l):
    X=0.4124*l[0]+0.3576*l[1]+0.1805*l[2]; Y=0.2126*l[0]+0.7152*l[1]+0.0722*l[2]; Z=0.0193*l[0]+0.1192*l[1]+0.9505*l[2]
    f=lambda t: t**(1/3) if t>0.008856 else 7.787*t+16/116
    x,y,z=f(X/0.95047),f(Y),f(Z/1.08883); return (116*y-16,500*(x-y),200*(y-z))
def de2000(a,b):
    L1,a1,b1=a;L2,a2,b2=b; C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7))); a1p=(1+G)*a1;a2p=(1+G)*a2
    C1p=math.hypot(a1p,b1);C2p=math.hypot(a2p,b2)
    h=lambda x,y:(math.degrees(math.atan2(y,x))%360) if (x or y) else 0
    h1=h(a1p,b1);h2=h(a2p,b2); dL=L2-L1;dC=C2p-C1p
    dh=0 if C1p*C2p==0 else (h2-h1 if abs(h2-h1)<=180 else h2-h1-360 if h2-h1>180 else h2-h1+360)
    dH=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2)); Lb=(L1+L2)/2;Cbp=(C1p+C2p)/2
    hb=(h1+h2)/2 if abs(h1-h2)<=180 else (h1+h2+360)/2 if h1+h2<360 else (h1+h2-360)/2
    if C1p*C2p==0: hb=h1+h2
    T=1-0.17*math.cos(math.radians(hb-30))+0.24*math.cos(math.radians(2*hb))+0.32*math.cos(math.radians(3*hb+6))-0.20*math.cos(math.radians(4*hb-63))
    dth=30*math.exp(-((hb-275)/25)**2); Rc=2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    Sl=1+0.015*(Lb-50)**2/math.sqrt(20+(Lb-50)**2);Sc=1+0.045*Cbp;Sh=1+0.015*Cbp*T;Rt=-math.sin(math.radians(2*dth))*Rc
    return math.sqrt((dL/Sl)**2+(dC/Sc)**2+(dH/Sh)**2+Rt*(dC/Sc)*(dH/Sh))
def lum(c): l=[lin(x) for x in hex2(c)]; return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2]
def contrast(a,b): A,B=sorted([lum(a),lum(b)],reverse=True); return (A+0.05)/(B+0.05)
names=list(P)
print('WCAG contrast of label text on fill:')
for n in names: print(f'  {n}: {contrast(*P[n]):.1f}:1   L* of fill {lab(sim(P[n][0],M["normal"]))[0]:.0f}')
for kind,m in M.items():
    labs={n:lab(sim(P[n][0],m)) for n in names}
    pairs=[(de2000(labs[a],labs[b]),a,b) for a,b in itertools.combinations(names,2)]
    worst=min(pairs)
    print(f'{kind}: smallest CIEDE2000 between two fills = {worst[0]:.1f} ({worst[1]} vs {worst[2]}); adjacent levels:',
          ', '.join(f'{a.split()[0]}-{b.split()[0]} {de2000(labs[a],labs[b]):.1f}' for a,b in zip(names[:4],names[1:4])))
