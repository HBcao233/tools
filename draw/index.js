(function(){
  window['$'] = document.querySelector.bind(document);
  window['$$'] = document.querySelectorAll.bind(document);
  window['isNumber'] = s => Object.prototype.toString.call(s) === "[object Number]";
  window['isString'] = s => Object.prototype.toString.call(s) === "[object String]";
  window['isArrayLike'] = s => s != null && typeof s[Symbol.iterator] === 'function';
})();

window.addEventListener('load', () => {
  let result = $('#result');
  let output = $('#output');
  const s = window.localStorage;
  for (const k of (new FormData($('form'))).keys()) {
    let v, t;
    if (v = s.getItem(k)) {
      if (t = $(`input[name="${k}"][value="${v}"]`)) {
        t.checked = true;
      } else if (t = $(`input[type="normal"][name="${k}"]`)) t.value = v;
      else if (t = $(`textarea[name="${k}"]`)) t.value = v;
    }
  }
  
  document.addEventListener('change', (e) => {
    s.setItem(e.target.name, e.target.value);
  })
  
  let drawing = false;
  let start_time = 0;
  let timer = null;
  let time;
  document.addEventListener('click', e => {
    if (e.target.closest('.draw')) {
      if ($('#model').value == '') {
        output.innerText = '请输入模型名';
        return
      }
      if (drawing) return;

      output.innerText = '生成中...';
      drawing = true;
      e.target.disabled = true;
      start_time = Date.now();
      timer = setInterval(() => {
        time = Math.floor((Date.now() - start_time) / 100) / 10
        e.target.innerText = time.toFixed(1) + 's';
      }, 100);
      let params = new window.URLSearchParams(new FormData($('.form')));
      fetch(`https://hbcaodog--art-f.modal.run/api/art?${params}`).then(async (r) => {
        time = Math.floor((Date.now() - start_time) / 100) / 10
        clearInterval(timer);
        e.target.innerText = '绘画';
        drawing = false;
        e.target.disabled = false;
        res = await r.json();
        if (res.code != 0) {
          output.innerText = `生成失败: ${res.message}, 用时: ${time.toFixed(1)}s`;
          return
        }
        
        output.innerText = `生成成功, 用时: ${time.toFixed(1)}s`;
        result.src = `https://hbcaodog--art-f.modal.run/hosting/${res.data.url}`; 
        result.style.opacity = 1;
      }).catch(e => {
        output.innerText = `生成失败, 用时: ${time.toFixed(1)}s`;
        console.error('生成失败', e)
        drawing = false;
        e.target.disabled = false;
      })
    }
  });
});
