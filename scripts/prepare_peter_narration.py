"""Extract narration for the included illustrated Peter Rabbit edition (not a generic EPUB importer)."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def prepare():
    with ZipFile(ROOT/'web/learn/books/the-tale-of-peter-rabbit.epub') as archive:
        candidates = [name for name in archive.namelist() if name.endswith('_14838-h-0.htm.xhtml')]
        if len(candidates) != 1: raise ValueError('Included edition changed; review its reading order.')
        root = ET.fromstring(archive.read(candidates[0]))
    body = root.find('{*}body')
    pages, paragraphs, page, started = [], [], 1, False
    def flush():
        if paragraphs:
            text='\n\n'.join(paragraphs)
            pages.append({'id':f'page-{page:02d}', 'match_text':paragraphs[0][:100], 'text':text})
            paragraphs.clear()
    # This edition uses an illustration followed by sibling paragraphs per reader spread.
    for node in body.iter():
        tag=node.tag.rsplit('}',1)[-1]
        if tag == 'img':
            flush();page+=1
        elif tag == 'p':
            text=' '.join(''.join(node.itertext()).split())
            if text.startswith('Once upon a time there were four little Rabbits'): started=True
            if started and text: paragraphs.append(text)
    flush()
    if not pages or not pages[-1]['text'].endswith('blackberries for supper.'):
        raise ValueError('Story boundaries changed; review the extraction before synthesis.')
    template=json.loads((ROOT/'story_mode/narration/peter-rabbit.example.json').read_text())
    template.update(script_version='full-book-1',passages=pages)
    return template


if __name__ == '__main__':
    from build_narration import validate
    script=validate(prepare())
    output=ROOT/'story_mode/narration/peter-rabbit.json'
    output.write_text(json.dumps(script,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'script':str(output),'pages':len(script['passages']),
        'characters':sum(len(p['text']) for p in script['passages'])}))
