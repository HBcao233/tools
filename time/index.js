window['$'] = document.querySelector.bind(document);
window['$$'] = document.querySelectorAll.bind(document);

const isNumber = s => Object.prototype.toString.call(s) === "[object Number]";
const isString = s => Object.prototype.toString.call(s) === "[object String]";
const isArrayLike = s => s != null && typeof s[Symbol.iterator] === 'function';

/**
 * 创建 Element
 * @param {String} tagName 
 * @param {Object} options 
 * @param {function} func 
 * @returns {SVGElement | HTMLElement}
 */
function tag(tagName, options, func) {
  options = options || {};
  var svgTags = ['svg', 'g', 'path', 'filter', 'animate', 'marker', 'line', 'polyline', 'rect', 'circle', 'ellipse', 'polygon'];
  let newElement;
  if (svgTags.indexOf(tagName) >= 0) {
    newElement = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  } else {
    newElement = document.createElement(tagName);
  }
  if (options.id) newElement.id = options.id;
  if (options.class) {
    if (!Array.isArray(options.class)) options.class = options.class.split(' ');
    for (const e of options.class) {
      if (e) newElement.classList.add(e);
    }
  }
  if (options.innerHTML) newElement.innerHTML = options.innerHTML;
  else if (options.innerText) newElement.innerText = options.innerText;
  if (options.children) {
    if (!isArrayLike(options.children)) options.children = [options.children];
    for (const e of options.children) {
      if (isString(e) || isNumber(e)) e = document.createTextNode(e);
      if (e !== undefined && e !== null) newElement.appendChild(e);
    }
  }
  if (options.style) newElement.style.cssText = options.style
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      newElement.setAttribute(k, v)
    }
  }
  func && func(newElement)
  return newElement;
}

class DateSelector {
  static init() {
    let now = new Date();
    DateSelector.time = Math.floor(now.getTime() / 1000);
    $('.date_selecter .calendar .year').innerHTML = '';
    $('.date_selecter .calendar .year').appendChild(
      tag('option', {
        innerText: (now.getFullYear()) + ' 年', 
        attrs: {
          value: now.getFullYear(),
          checked: '',
        },
      })
    );
    $('.date_selecter .calendar .year').appendChild(
      tag('option', {
        innerText: (now.getFullYear() + 1) + ' 年', 
        attrs: {
          value: now.getFullYear() + 1,
        },
      })
    );

    $('.date_selecter .time-box .year').innerHTML = '';
    $('.date_selecter .time-box .year').appendChild(
      tag('option', {
        innerText: now.getFullYear(), 
        attrs: {
          value: now.getFullYear(),
          checked: '',
        },
      })
    );
    $('.date_selecter .time-box .year').appendChild(
      tag('option', {
        innerText: now.getFullYear() + 1, 
        attrs: {
          value: now.getFullYear() + 1,
        },
      })
    );
  }
  
  static fill(time) {
    if (!time) return;
    let t;
    let now = new Date(time * 1000);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    $('.date_selecter .calendar .year').value = year;
    $('.date_selecter .time-box .year').value = year;
    $('.date_selecter .calendar .month').value = month;
    $('.date_selecter .time-box .month').value = month;
    $('.timestamp').value = Math.floor(now.getTime() / 1000)
    const daynum = (new Date(year, month, 0)).getDate();
    now.setDate(1);
    let offset = now.getDay();
    if (offset == 0) offset = 7;
    let j = 1;
    $('.date_selecter .time-box .day').innerHTML = '';
    for (let i = 1; i < 43; i++) {
      let td = document.querySelector(`.date_selecter td[data-index="${i}"]`)
      if (i < offset || i >= offset + daynum) {
        td.removeAttribute('data-day');
        td.innerText = ''
      } else {
        td.setAttribute('data-day', j);
        td.innerText = j;
        $('.date_selecter .calendar')
        $('.date_selecter .time-box .day').appendChild(tag('option', {
          innerText: j,
          attrs: {
            value: j,
          }
        }))
        j++;
      }
    }
    if (t = $('.date_selecter .calendar td.active')) t.classList.remove('active')
    $(`.date_selecter .calendar td[data-day="${day}"]`).classList.add('active');
    $('.date_selecter .time-box .day').value = day;
    $('.date_selecter .time-box .hour').value = now.getHours();
    $('.date_selecter .time-box .minute').value = now.getMinutes();
    $('.date_selecter .time-box .second').value = now.getSeconds();
  }
  
  static get time() {
    return parseInt($('.date_selecter').getAttribute('data-time') || '0');
  }
  
  static set time(t) {
    $('.date_selecter').setAttribute('data-time', t);
    let e = new Event('change', {
      time: t,
    });
    $('.date_selecter').dispatchEvent(e);
    DateSelector.fill(t);
  }
  
  static show() {
    let time = DateSelector.time;
    if (!time) {
      DateSelector.init()
      time = DateSelector.time;
    }
    
    DateSelector.fill(time)
    show_dialog('dialog.date_selecter');
  }
  
  static close() {
    $('dialog.date_selecter').close()
  }
}
document.addEventListener('click', (e) => {
  let t, index, day;
  if (e.target.nodeName == 'DIALOG') {
    e.target.close();
  }
  if (e.target.closest('.date_selecter td')) {
    day = e.target.getAttribute('data-day')
    if (!day) return;
    time = DateSelector.time;
    if (!time) {
      DateSelector.init();
      time = DateSelector.time;
    } 
    now = new Date(time * 1000);
    now.setDate(day);
    time = Math.floor(now.getTime() / 1000);
    DateSelector.time = time;
  }
});
document.addEventListener('change', (e) => {
  const name = e.target.name;
  const value = e.target.value;
  let t, time, now, month, year, daynum, day;
  switch (true) {
    case !!e.target.closest('.date_selecter .year'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      month = now.getMonth() + 1;
      day = now.getDate();
      daynum = (new Date(value, month, 0)).getDate();
      if (day > daynum) {
        now.setDate(daynum);
      }
      now.setFullYear(value);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time;
      break;
    
    case !!e.target.closest('.date_selecter .month'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      year = now.getFullYear();
      day = now.getDate();
      daynum = (new Date(year, parseInt(value), 0)).getDate();
      if (day > daynum) {
        now.setDate(daynum);
      }
      now.setMonth(parseInt(value) - 1);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
    
    case !!e.target.closest('.date_selecter .day'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      now.setDate(value);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
    
    case !!e.target.closest('.date_selecter .hour'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      now.setHours(value);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
    
    case !!e.target.closest('.date_selecter .minute'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      now.setMinutes(value);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
    
    case !!e.target.closest('.date_selecter .second'):
      time = DateSelector.time;
      if (!time) {
        DateSelector.init();
        time = DateSelector.time;
      } 
      now = new Date(time * 1000);
      now.setSeconds(value);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
      
    case !!e.target.closest('.date_selecter .timestamp'):
      if (value.length != 10) return;

      now = new Date(value * 1000);
      time = Math.floor(now.getTime() / 1000);
      DateSelector.time = time
      break;
  }
})


document.addEventListener('DOMContentLoaded', () => {
  DateSelector.init()
})