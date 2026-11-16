from pathlib import Path
root=Path(__file__).resolve().parent
dist=root/'dist'
html=(dist/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text(encoding='utf-8')+'</style>')
for name in ['data.js','engine.js','app.js']:
    script=(dist/name).read_text(encoding='utf-8').replace('</script','<\\/script')
    html=html.replace(f'<script src="{name}"></script>','<script>'+script+'</script>')
(root/'末路三十日.html').write_text(html,encoding='utf-8')
(root/'index.html').write_text(html,encoding='utf-8')
print('Standalone HTML ready; no server, network or installation required.')
