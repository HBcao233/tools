(function(){
  window['$'] = document.querySelector.bind(document);
  window['$$'] = document.querySelectorAll.bind(document);
  window['isNumber'] = s => Object.prototype.toString.call(s) === "[object Number]";
  window['isString'] = s => Object.prototype.toString.call(s) === "[object String]";
  window['isArrayLike'] = s => s != null && typeof s[Symbol.iterator] === 'function';
})();


const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const format_filesize = (n) => {
  if (size < 1024) return `${n} B`;
  if (size < 1024 * 1024) return `${n / 1024} KB`;
  return `${n / (1024 * 1024)} MB`;
}

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = $('#upload-area');
  const fileInput = $('#upload-area+input');
  const previewImage = $('#upload-area img');
  
  const maskArea = $('#mask-area');
  const maskInput = $('#mask-area+input');
  const maskImage = $('#mask-area img');
  
  const submitBtn = $('#draw');
  
  uploadArea.addEventListener('click', function(e) {
    if (!e.target.closest('.delete-btn')) {
      fileInput.click();
    }
  });
  maskArea.addEventListener('click', function(e) {
    if (!e.target.closest('.delete-btn')) {
      maskInput.click();
    }
  });
  
  fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file || file.size == 0) {
        previewImage.src = '';
        return;
      }
      
      // 检查文件类型
      if (!file.type.match('image.*')) {
        alert('请选择图片文件！');
        return;
      }
      
      // 检查文件大小
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`图片大小不能超过 ${format_filesize(MAX_IMAGE_SIZE)}`);
        return;
      }
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        uploadArea.querySelector('.plus-icon').style.display = 'none';
        uploadArea.classList.add('active', 'has-image');
      };
      reader.readAsDataURL(file);
    }
  });
  maskInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 检查文件类型
      if (!file.type.match('image.*')) {
        alert('请选择图片文件！');
        return;
      }
      
      // 检查文件大小
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`图片大小不能超过 ${format_filesize(MAX_IMAGE_SIZE)}`);
        return;
      }
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = function(e) {
        maskImage.src = e.target.result;
        maskImage.style.display = 'block';
        maskArea.querySelector('.plus-icon').style.display = 'none';
        maskArea.classList.add('active', 'has-image');
      };
      reader.readAsDataURL(file);
    }
  });
  
  $('#upload-area .delete-btn').addEventListener('click', function(e) {
    e.stopPropagation(); 
    $('#upload-area + input').value = '';
    $('#upload-area img').style.display = 'none';
    $('#upload-area').querySelector('.plus-icon').style.display = 'block';
    $('#upload-area').classList.remove('active', 'has-image');
  });
  $('#mask-area .delete-btn').addEventListener('click', function(e) {
    e.stopPropagation(); 
    $('#mask-area + input').value = '';
    $('#mask-area img').style.display = 'none';
    $('#mask-area').querySelector('.plus-icon').style.display = 'block';
    $('#mask-area').classList.remove('active', 'has-image');
  });
  
  // 拖拽功能
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('active');
  });
  
  uploadArea.addEventListener('dragleave', function() {
    if (!uploadArea.classList.contains('has-image')) {
      uploadArea.classList.remove('active');
    }
  });
  
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('active');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  });
  
  const form = $('form');
  let result = $('#result');
  let output = $('#output');
  const s = window.localStorage;
  for (const k of (new FormData(form)).keys()) {
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
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if ($('#model').value == '') {
      output.innerText = '请输入模型名';
      return
    }
    if (drawing) return;

    result.style.opacity = 0;
    result.src = '';
    output.innerText = '生成中...';
    drawing = true;
    submitBtn.disabled = true;
    start_time = Date.now();
    timer = setInterval(() => {
      time = Math.floor((Date.now() - start_time) / 100) / 10
      submitBtn.innerText = time.toFixed(1) + 's';
    }, 100);
    let formData = new FormData($('.form'));
    if (!formData.get('url')) {
      return alert('API地址必填');
    }
    const url = formData.get('url');
    if (formData.get('image').size == 0) formData.delete('image');
    
    fetch(
      `${url}/api/art`, {
      method: 'POST',
      body: formData,
    }).then(async (r) => {
      time = Math.floor((Date.now() - start_time) / 100) / 10
      clearInterval(timer);
      submitBtn.innerText = '绘画';
      drawing = false;
      submitBtn.disabled = false;
      res = await r.json();
      if (res.code != 0) {
        output.innerText = `生成失败: ${res.message}, 用时: ${time.toFixed(1)}s`;
        return
      }
      
      output.innerText = `生成成功, 用时: ${time.toFixed(1)}s`;
      result.src = `${url}/hosting/${res.data.url}`; 
      result.style.opacity = 1;
    }).catch(e => {
      output.innerText = `生成失败, 用时: ${time.toFixed(1)}s`;
      console.error('生成失败', e)
      clearInterval(timer);
      drawing = false;
      submitBtn.disabled = false;
    })
    
  });
});
