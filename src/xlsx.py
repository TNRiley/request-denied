import zipfile,re,xml.etree.ElementTree as ET
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def rows(path):
    z=zipfile.ZipFile(path)
    ss=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):
            ss.append(''.join(t.text or '' for t in si.iter('{%s}t'%NS['m'])))
    sheets=sorted(n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml',n))
    out=[]
    for sh in sheets:
        for r in ET.fromstring(z.read(sh)).iter('{%s}row'%NS['m']):
            vals={}
            for c in r.findall('m:c',NS):
                col=re.match(r'[A-Z]+',c.get('r')).group(); v=c.find('m:v',NS); t=c.get('t')
                if t=='inlineStr': val=''.join(x.text or '' for x in c.iter('{%s}t'%NS['m']))
                elif v is None: continue
                elif t=='s': val=ss[int(v.text)]
                else: val=v.text
                vals[col]=val
            if vals:
                w=max(len(k) for k in vals); cols=sorted(vals,key=lambda k:(len(k),k))
                out.append([vals[k] for k in cols])
    return out
