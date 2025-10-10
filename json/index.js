(function(){
  window['$'] = document.querySelector.bind(document);
  window['$$'] = document.querySelectorAll.bind(document);
  window['isNumber'] = s => Object.prototype.toString.call(s) === "[object Number]";
  window['isString'] = s => Object.prototype.toString.call(s) === "[object String]";
  window['isArrayLike'] = s => s != null && typeof s[Symbol.iterator] === 'function';
  
  const htmlEncode = (str) => {
    let temp = document.createElement("div");
    (temp.textContent != undefined) ? (temp.textContent = str) : (temp.innerText = str);
    return temp.innerHTML;
  }

  const widths = [
    [126, 1], [159, 0], 
    [687, 1], [710, 0], 
    [711, 1], [727, 0], 
    [733, 1], [879, 0], 
    [1154, 1], [1161, 0], 
    [4347, 1], [4447, 2], 
    [7467, 1], [7521, 0], 
    [8369, 1], [8426, 0], 
    [9000, 1], [9002, 2], 
    [11021, 1], [12350, 2], 
    [12351, 1], [12438, 2], 
    [12442, 0], [19893, 2], 
    [19967, 1], [55203, 2], 
    [63743, 1], [64106, 2], 
    [65039, 1], [65059, 0],
    [65131, 2], [65279, 1], 
    [65376, 2], [65500, 1], 
    [65510, 2], [120831, 1], 
    [262141, 2], [1114109, 1],
  ]
  function char_width(o) {
    if (o === 0xe || o === 0xf) return 0;
    for (const [num, wid] of widths) if (o <= num) return wid;
    return 1
  }
  function str_width(s) {
    let count = 0;
    for (let i = 0; i < s.length; i++) {
      count += char_width(s.charCodeAt(i))
    }
    return count;
  }
  
  function _string_with_arrows(code, pos_start, pos_end, error_pos_start, error_pos_end) {
    if (!error_pos_start) error_pos_start = pos_start;
    if (!error_pos_end) error_pos_end = pos_end;
    let res = [];
    let idx_start = Math.max(code.slice(0, pos_start.index).lastIndexOf('\n'), 0);
    let idx_end = code.indexOf('\n', idx_start + 1);
    if (idx_end < 0) idx_end = code.length;
    const line_count = pos_end.line - pos_start.line + 1;
    const error_line_start = error_pos_start.line - pos_start.line;
    const error_line_end = error_pos_end.line - pos_start.line;
    
    for (let i = 0; i < line_count; i++) {
      let line = code.slice(idx_start, idx_end).replace(/^\n+|\n+$/g, '');
      const before_text = line.slice(0, pos_start.column);
      let space_count = str_width(before_text);
      
      const column_start = i < error_line_start ? line.length : error_pos_start.column;
      const column_end = i == error_line_end ? error_pos_end.column : line.length - 1;
      const error_text = line.slice(column_start, column_end);
      const arrow_count = str_width(error_text);
      
      if (line.length > 25) {
        line = code.slice(pos_start.column - 10, pos_start.column + 15).replace(/^\n+|\n+$/g, '');
        space_count = 10;
      }
      
      res.push('  ' + line)
      if (arrow_count > 0) res.push('  ' + ' '.repeat(space_count) + '^'.repeat(arrow_count))
      
      idx_start = idx_end;
      idx_end = code.indexOf('\n', idx_start + 1);
      if (idx_end < 0) idx_end = code.length;
    }
    return res.join('\n');
  }
  
  function DIGITS(s) {
    return /[0-9]/.test(s);
  }
  
  function HEX_DIGITS(s) {
    return /[0-9a-fA-F]/.test(s);
  }
  
  function STRING_FLAG(s) {
    return /['"`]/.test(s);
  } 
  
  function LETTERS(s) {
    return /([a-zA-Z_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  }
  
  function LETTERS_DIGITS(s) {
    return /([a-zA-Z0-9_\$]|[^\u0000-\u007F])/.test(s);
  }
  
  function LETTERS_SYMBOLS(s) {
    return /([a-zA-Z_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  }
  function LETTERS_SYMBOLS_DIGITS(s) {
    return /([a-zA-Z0-9_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  }
  
  function hex(s) {
    return s.charCodeAt().toString(16).padStart(4, '0')
  }
  
  class Tokens {
    static EOF = 'EOF';
    static NAME = 'NAME';
    static KEYWORD = 'KEYWORD';
    static NUMBER = 'NUMBER';
    static STRING = 'STRING';
    static LSQB = 'LSQB';  // [
    static RSQB = 'RSQB';  // ]
    static COLON = 'COLON';  // :
    static COMMA = 'COMMA';  // ,
    static LBRACE = 'LBRACE';  // {
    static RBRACE = 'RBRACE';  // }
    static DOUBLESLASH = 'DOUBLESLASH';  // //
    static SLASHSTAR = 'SLASHSTAR';  // /*
    static STARSLASH = 'STARSLASH';  // */
    static HASHTAG = 'HASHTAG';  // #
  }
  
  function ISEOF(type) {
    return type === Tokens.EOF;
  }
  
  const len = (s) => {
    return s = s + '', s.replace(/[\x00-\x7f]/g, '').length + s.replace(/[^\x00-\xff]/g, '').length / 2;
  }
  
  OP_DICT = {
    '[': Tokens.LSQB,
    ']': Tokens.RSQB,
    '{': Tokens.LBRACE,
    '}': Tokens.RBRACE,
    ',': Tokens.COMMA,
    ':': Tokens.COLON,
  }
  ESCAPE_CHAR = {
    '"': '"',
    '/': '/',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
  }
  KEYWORDS = {
    'true': true,
    'false': false,
    'null': null,
    'True': true,
    'False': false,
    'None': null,
  }
  
  class Position {
    constructor(index, line, column, code) {
      this.index = index;
      this.line = line;
      this.column = column;
      this.code = code;
    }
    
    advance(char) {
      this.index += 1;
      this.column += 1;
      if (char === '\n') {
        this.column = 0;
        this.line += 1;
      }
    }
    
    copy() {
      return new Position(this.index, this.line, this.column, this.code);
    }
  }

  class _SyntaxError extends Error {
    constructor(message, pos_start, pos_end, error_pos_start, error_pos_end) {
      super(message);
      this.pos_start = pos_start;
      if (!pos_end) pos_end = pos_start.copy();
      this.pos_end = pos_end;
      this.error_pos_start = error_pos_start;
      this.error_pos_end = error_pos_end;
      this.name = 'SyntaxError';
    }
    
    toString() {
      return (
        `Line ${this.pos_end.line + 1} Column ${this.pos_end.column}\n` 
        + _string_with_arrows(this.pos_start.code, this.pos_start, this.pos_end, this.error_pos_start, this.error_pos_end) +
        `\n  SyntaxError: ${this.message}`
      );
    }
  }
  
  class Token {
    constructor(type, value, pos_start, pos_end) {
      this.type = type;
      this.value = value;
      this.pos_start = pos_start;
      if (pos_end === undefined) pos_end = pos_start.copy();
      this.pos_end = pos_end;
    }
    
    matches (type, values) {
      if (this.type != type) return false;
      if (!isArrayLike(values)) values = [values];
      for (const v of values) if (this.value == v) return true;
      return false
    }
  }
  
  class Lexer {
    constructor(code) {
      this.code = code;
      this.char = undefined;
      this.pos = new Position(-1, 0, -1, code);
      this.advance();
    }
    
    advance(count) {
      if (!count) count = 1;
      while (count > 0) {
        this.pos.advance(this.char)
        count--;
      }
      this.update()
    }
    
    update() {
      this.char = this.code[this.pos.index];
    }
    
    lookahead(count) {
      if (!count) count = 1;
      let index = this.pos.index + count;
      return this.code[index];
    }
    
    parse() {
      let pos_start;
      let res = [];
      let token;
      while (this.char) {
        if (this.char === '#') {
          this.skip_inline_comment();
          continue;
        }
        if (this.char === ' ' || this.char === '\n') {
          this.advance()
          continue;
        }
        if (this.char === '/') {
          if (this.lookahead(1) === '/') {
            this.advance();
            this.skip_inline_comment();
          } else if (this.lookahead(1) === '*') {
            this.advance(2);
            this.ship_block_comment();
          } else {
            pos_start = this.pos.copy()
            this.advance();
            throw new _SyntaxError(
              "expected '/' or '*'", 
              pos_start,
              this.pos.copy()
            );
          }
          continue;
        }
        if (this.char === '-' || DIGITS(this.char) || (this.char === '.' && DIGITS(this.lookahead(1))) ) {
          token = this.make_number();
        } else if (this.char in OP_DICT) {
          token = this.make_opertor()
        } else if (STRING_FLAG(this.char)) {
          token = this.make_string(this.char);
        } else if (LETTERS_SYMBOLS(this.char)) {
          token = this.make_name()
        } else {
          pos_start = this.pos.copy();
          let char = this.char;
          this.advance();
          throw new _SyntaxError(
            `invalid character '${char}' (U+${hex(this.char)})`,
            pos_start, this.pos.copy(),
          )
        }
        res.push(token);
      }
      res.push(new Token(Tokens.EOF, null, this.pos.copy(), this.pos.copy()));
      return res;
    }
    
    skip_inline_comment() {
      this.advance();
      while (this.char && this.char !== '\n') {
        this.advance();
      }
    }
    ship_block_comment() {
      let pos_start = this.pos.copy();
      while (this.char) {
        if (this.char === '*' && this.lookahead(1) === '/') {
          break;
        }
        this.advance();
      }
      if (this.char !== '*' || this.lookahead(1) !== '/') {
        throw new _SyntaxError(
          `expected '*/'`,
          pos_start,
          this.pos.copy(),
        );
      }
    }
    
    make_number() {
      let pos_start = this.pos.copy()
      let num;
      if (this.char == '0' && this.lookahead() == 'x') {
        this.advance(2);
        num = this.make_num(16);
     } else num = this.make_num(10);
     return new Token(Tokens.NUMBER, num, pos_start, this.pos.copy())
    }
    
    make_num(base=10) {
      const bases = {
        10: ['decimal', DIGITS],
        16: ['hexadecimal', HEX_DIGITS],
      }
      let num = []
      let pos_start = this.pos.copy()
      let is_float = false
      while (this.char && LETTERS_SYMBOLS_DIGITS(this.char) || this.char == '_' || this.char === '.' || this.char === '-') {
        if (this.char == '.') {
          if (base != 10) {
            this.advance()
            throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
          }
          is_float = true;
        } else if (this.char == '_') {
          this.advance();
          continue
        } else if (!bases[base][1](this.char) && this.char !== '-') {
          this.advance()
          throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
        }
        num.push(this.char);
        this.advance();
      }
      num = num.join('');
      if (num.length == 0) {
        this.advance()
        throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
      }
      if (is_float) return parseFloat(num)
      return parseInt(num, base)
    }
    
    make_opertor() {
      let pos_start = this.pos.copy()
      let type = OP_DICT[this.char]
      this.advance()
      return new Token(type, null, pos_start, this.pos.copy())
    }
    
    make_string(quotation) {
      let res = []
      let pos_start = this.pos.copy()
      let escape_character = false
      
      this.advance()
      while (this.char && (this.char != quotation || escape_character)) {
        if (!this.char || this.char == '\n') {
          throw new _SyntaxError(`unterminated string literal (expected ${quotation === "'" ? `"'"` : `'${quotation}'`})`, pos_start, this.pos.copy());
        }
        if (escape_character) {
          escape_character = false;
          if (this.char !== 'u') {
            res.push(ESCAPE_CHAR[this.char] || this.char)
            this.advance();
            continue;
          } else {
            let pos_start1 = this.pos.copy();
            this.advance();
            let u = [];
            for (let i = 0; i < 4; i++) {
              if (!('0123456789abcdefABCDEF'.includes(this.char))) {
                throw new _SyntaxError('Invalid Unicode escape sequence', pos_start1, this.pos.copy());
              }
              u.push(this.char);
              this.advance();
            }
            res.push(String.fromCharCode(parseInt(u.join(''), 16)))
          }
          continue;
        }
        if (this.char == '\\') {
          escape_character = true;
          this.advance();
          continue;
        }
        res.push(this.char)
        this.advance()
      }
      if (this.char !== quotation) {
        throw new _SyntaxError(`unterminated string literal (expected ${quotation === "'" ? `"'"` : `'${quotation}'`})`, pos_start, this.pos.copy());
      }
      this.advance();
      return new Token(Tokens.STRING, res.join(''), pos_start, this.pos.copy())
    }
    
    make_name() {
      let res = []
      let pos_start = this.pos.copy()
      res.push(this.char)
      this.advance()
      while (this.char && LETTERS_SYMBOLS_DIGITS(this.char)) {
        res.push(this.char)
        this.advance()
      }
      res = res.join('')
    
      if (res in KEYWORDS) {
        return new Token(Tokens.KEYWORD, KEYWORDS[res], pos_start, this.pos.copy())
      } 
      return new Token(Tokens.NAME, res, pos_start, this.pos.copy())
    }
  }
  
  class ASTNode {
    type;
    pos_start;
    pos_end;
    parse() {
      throw new Error('未实现的抽象方法')
    }
    parse_html() {
      throw new Error('未实现的抽象方法');
    }
  }
  
  class SingleNode extends ASTNode {
    type = 'single'
    
    constructor(value) {
      super()
      this.value = value;
      this.pos_start = value.pos_start ? value.pos_start.copy() : null;
      this.pos_end = value.pos_end ? value.pos_end.copy(): null;
    }
    
    parse() {
      return this.value.value + '';
    }
    
    parse_html() {
      return `<div class="single"><span class="single_value" contenteditable>${this.value.value}</span></div>`
    }
  }
  class NullNode extends SingleNode {
    type = 'null'
  }
  class BooleanNode extends SingleNode {
    type = 'boolean'
  }
  class NumberNode extends SingleNode {
    type = 'number'
  }
  class StringNode extends SingleNode {
    type = 'string'
    
    parse() {
      if (isString(this.value.value)) return JSON.stringify(this.value.value);
      return '"' + this.value.value + '"';
    }
    
    parse_html() {
      return `<div class="string_start">&quot;</div><div class="single string"><span class="single_value" contenteditable>${htmlEncode(this.value.value)}</span></div><div class="string_end">&quot;</div>`
    }
  }
  
  class WarningNode extends ASTNode {
    type = 'warning'
    
    constructor(value) {
      super()
      this.value = value;
    }
    
    parse() {
      return '';
    }
    
    parse_html() {
      return `<div class="single warning"><span class="warning_value" contenteditable>${htmlEncode(this.value.value)}</span></div>`
    }
  }
  class ErrorNode extends ASTNode {
    type = 'error'
    
    constructor(value) {
      super()
      this.value = value;
    }
    
    parse() {
      return '';
    }
    
    parse_html() {
      return `<div class="single error"><span class="error_value" contenteditable>${htmlEncode(this.value.value)}</span></div>`
    }
  }
  
  class ListNode extends ASTNode {
    type = 'list'
    
    constructor(items, pos_start, pos_end) {
      super()
      this.items = items;
      this.pos_start = this.pos_start;
      this.pos_end = pos_end;
    }
    
    parse(indent) {
      let res = [];
      for (const node of this.items) {
        if (node instanceof WarningNode || node instanceof ErrorNode) continue;
        res.push(node.parse(indent));
      }
      if (res.length === 0) return '[]';
      if (indent !== undefined && indent !== null) {
        const ind = '\n' + ' '.repeat(indent);
        const sep = ',' + ind;
        return '[' + ('\n' + res.join(',\n')).split('\n').join(ind) + '\n]';
      }
      return `[${res.join(',')}]`;
    }
    
    parse_html(indent) {
      let res = [];
      for (let i = 0; i < this.items.length; i++) {
        res.push(
          `<div class="list_item"><div class="list_key">${i}</div><div class="list_sep">:</div><div class="list_value">${this.items[i].parse_html(indent)}</div></div>`
        )
      }
      return `<div class="list indent-${indent}"><div class="collapse_btn"></div><div class="list_start">[</div><div class="list_items">${res.join('<div class="list_item_sep">,</div>' + (indent !== null && indent !== undefined ? '<br>':''))}</div><div class="list_end">]</div></div>`;
    }
  }
  
  class DictNode extends ASTNode {
    type = 'dict';
    constructor(items, pos_start, pos_end) {
      super()
      this.items = items;
      this.pos_start = this.pos_start;
      this.pos_end = pos_end;
    }
    
    parse(indent) {
      let res = [];
      const add = indent !== undefined && indent !== null ? ' ': '';
      for (const [k, v] of this.items) {
        if (k instanceof WarningNode || k instanceof ErrorNode || v instanceof WarningNode || v instanceof ErrorNode) continue;
        res.push(k.parse(indent) + ':' + add + v.parse(indent))
      }
      if (res.length === 0) return '{}';
      if (indent !== undefined && indent !== null) {
        const ind = '\n' + ' '.repeat(indent)
        const sep = ',' + ind;
        return '{' + ('\n' + res.join(',\n')).split('\n').join(ind) + '\n}'
      }
      return `{${res.join(',')}}`;
    }
    
    parse_html(indent) {
      let res = [];
      for (const [k, v] of this.items) {
        res.push(
          `<div class="dict_item"><div class="dict_key">${k.parse_html(indent)}</div><div class="dict_sep">:</div><div class="dict_value">${v.parse_html(indent)}</div></div>`
        )
      }
      return `<div class="dict indent-${indent}"><div class="collapse_btn"></div><div class="dict_start">{</div><div class="dict_items">${res.join('<div class="dict_item_sep">,</div>' + (indent !== null && indent !== undefined ? '<br>':''))}</div><div class="dict_end">}</div></div>`;
    }
  }
  
  class Parser {
    constructor(tokens) {
      this.tokens = tokens
      this.index = -1;
      this.token = undefined;
      this.advance();
    }
    
    advance(count) {
      if (!count) count = 1;
      this.index += count;
      this.update();
    }
    
    update() {
      this.token = this.tokens[this.index];
    }
     
    lookahead(count) {
      if (!count) count = 1;
      return this.tokens[this.index + count];
    }
    
    parse() {
      return this.json();
    }
    
    json() {
      if (ISEOF(this.token.type)) return [];
      let res = this.atom();
      if (!ISEOF(this.token.type)) {
        const err = new _SyntaxError(
          'the statement must not exist',
          this.token.pos_start, this.token.pos_end,
        );
        return [res, new WarningNode(new Token(Tokens.STRING, err.toString(), null, null))];
      }
      return res;
    }
    
    atom() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
        case Tokens.NAME:
          this.advance();
          if (tok.type === Tokens.KEYWORD) {
            if (tok.value === true) {
              return new BooleanNode(tok)
            }
            if (tok.value === false) {
              return new BooleanNode(tok)
            }
            return new NullNode(tok)
          }
          if (tok.type === Tokens.NUMBER) {
            return new NumberNode(tok);
          } 
          return new StringNode(tok);
        
        case Tokens.LSQB:
          return this.list_expr()
        case Tokens.LBRACE:
          return this.dict_expr();
        default: 
          throw new _SyntaxError(
            'invalid atom',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
    
    list_expr() {
      let pos_start = this.token.pos_start.copy();
      this.advance();
      if (this.token.type === Tokens.RSQB) {
        this.advance()
        return new ListNode([], pos_start, this.token.pos_end.copy());
      }

      let items = this.atoms();
      if (this.token.type != Tokens.RSQB) {
        items.push(new WarningNode(new Token(Tokens.STRING, 'expected "]"', null, null)))
      } else this.advance();
      return new ListNode(items, pos_start, this.token.pos_end.copy());
    }
    
    atoms() {
      let pos_start = this.token.pos_start.copy();
      let items;
      try {
        items = [this.atom()];
      } catch (e) {
        return [];
      }
      while (this.token.type === Tokens.COMMA) {
        this.advance()
        if (this.token.type === Tokens.RSQB) break;
        try {
          items.push(this.atom());
        } catch (e) {
        }
      }
      return items;
    }
    
    dict_expr() {
      let pos_start = this.token.pos_start.copy();
      this.advance();
      if (this.token.type === Tokens.RBRACE) {
        this.advance();
        return new DictNode([], pos_start, this.token.pos_end.copy());
      }
      let items = this.kvpairs()
      if (this.token.type !== Tokens.RBRACE) {
        items.push([
          new StringNode(new Token(Tokens.STRING, '', null, null)),
          new WarningNode(new Token(Tokens.STRING, 'expected "}"', null, null)), 
        ])
      } else this.advance();
      return new DictNode(items, pos_start, this.token.pos_end.copy());
    }
    
    kvpairs() {
      let items;
      items = [this.kvpair()];
      while (this.token.type == Tokens.COMMA) {
        this.advance();
        if (this.token.type == Tokens.RBRACE) break;
        items.push(this.kvpair());
      }
      return items;
    }
    
    kvpair() {
      let k;
      try {
        k = this.key();
      } catch (e) {
        return [
          new ErrorNode(new Token(Tokens.STRING, "expected a key", null, null)), 
          new StringNode(new Token(Tokens.STRING, '', null, null)),
        ]
      }
      if (this.token.type !== Tokens.COLON) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, 'expected ":"', null, null)), 
        ];
      }
      this.advance();
      if (this.token.type === Tokens.COMMA || this.token.type === Tokens.RSQB || this.token.type === Tokens.RBRACE) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, 'expected a value', null, null)), 
        ];
      }
      try {
        return [k, this.value()];
      } catch (e) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, "expected a value", null, null)), 
        ]
      }
    }
    
    key() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
        case Tokens.NAME:
          this.advance();
          return new StringNode(tok);
        default: 
          throw new _SyntaxError(
            'invalid key',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
    
    value() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
          this.advance();
          if (tok.type === Tokens.KEYWORD) {
            if (tok.value === true) {
              return new BooleanNode(tok)
            }
            if (tok.value === false) {
              return new BooleanNode(tok)
            }
            return new NullNode(tok)
          }
          if (tok.type === Tokens.NUMBER) {
            return new NumberNode(tok);
          } 
          return new StringNode(tok);
        
        case Tokens.LSQB:
          return this.list_expr()
        case Tokens.LBRACE:
          return this.dict_expr();
        default: 
          throw new _SyntaxError(
            'invalid value',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
  } 

  const formatting = (s) => {
    let lexer = new Lexer(s);
    try {
      let tokens = lexer.parse();
      let parser = new Parser(tokens);
      let node = parser.parse();
      return node;
    } catch (e) {
      if (!(e instanceof _SyntaxError)) {
        throw e;
      }
      return e.toString();
    }
  }
  window['formatting'] = formatting;
})();

window.addEventListener('load', () => {
  const copyToClipboard = (text) => {
    let nav = navigator || window.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(text);
      return
    }
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    let t = $('dialog[open]');
    if (!t) t = document.body;
    t.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    t.removeChild(tempInput);
  }
  
  /**
   * @name 计算一个句子在目标容器中占据多少行
   * @param { string } sentence
   * @param { number } width 目标容器的宽度 --- 文本域的内容宽度
   * @returns  { number }
   */
  const calcStringLines = (sentence, width, textarea) => {
    if (!width) return 0;
    // 将句子拆分，如果是纯英文句子可以使用.split(' ')进行拆分提升效率
    const words = sentence.split('');
    // 一个句子占据的行数
    let lineCount = 0;
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const textareaStyles = window.getComputedStyle(textarea);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      // 保持canvas的画笔与字体设置一致
      const font = `${textareaStyles.fontSize} ${textareaStyles.fontFamily}`;
      context.font = font;
      // 获取被测量文本的TextMetrics对象，主要拿width
      const wordWidth = context.measureText(words[i]).width;
      const lineWidth = context.measureText(currentLine).width;
      if (lineWidth + wordWidth > width) {
        // 当前的句子累计的词语已经大于目标容器的宽度了，要多占一行
        lineCount++;
        // 已经占一行了，要清空重新累加
        currentLine = words[i];
      } else {
        currentLine += words[i];
      }
    }
    // 最后剩余的占一行
    if (currentLine.trim() !== '') lineCount++;
    return lineCount;
  }
  
  const calcLines = (textarea) => {
    const text = textarea.value || textarea.innerText
    const lines = text.split('\n');
    const textareaWidth = textarea.getBoundingClientRect().width;
    // textarea滚动条宽度，没有则为0
    const textareaScrollWidth = textareaWidth - textarea.clientWidth;
    // textarea内边距，转成数字
    const parseNumber = (v) => v.endsWith('px') ? parseInt(v.slice(0, -2), 10) : 0;
    const textareaStyles = window.getComputedStyle(textarea);
    const textareaPaddingLeft = parseNumber(textareaStyles.paddingLeft);
    const textareaPaddingRight = parseNumber(textareaStyles.paddingRight);
    // textarea的内容宽度
    const textareaContentWidth = textareaWidth - textareaPaddingLeft -   textareaPaddingRight  - textareaScrollWidth;
    // 获取每个句子占多少行，数组形式记录
    const numLines = lines.map(lineString => calcStringLines(lineString, textareaContentWidth, textarea));
    // 将每个句子占据的行数转成对应的行号与空格
    let lineNumbers = [];
    let i = 1;
    while (numLines.length > 0) {
      const numLinesOfSentence = numLines.shift();
      lineNumbers.push(i);
      if (numLinesOfSentence > 1) {
        Array(numLinesOfSentence - 1)
          .fill('')
          .forEach((_) => lineNumbers.push(''));
      }
      i++;
    }
    return lineNumbers;
  }
  const showLineNumbers = (ele) => {
    const lines = calcLines(ele.querySelector('.input'));
    const lineDoms = Array.from({
      length: lines.length,
    }, (_, i) => `<span>${lines[i] || ''}<br></span>`);
    ele.querySelector('.numbers').innerHTML = lineDoms.join('');
  }
  const make_output = () => {
    let text = input.value.trim();
    let node = formatting(text);
    let warning;
    if (isString(node)) {
      res = node;
      output.innerText = res;
    } else if (isArrayLike(node)) {
      if (node.length == 0) {
        res = '';
        output.innerHTML = '';
      }else {
        res = node[0].parse(indent);
        output.innerHTML = node[0].parse_html(indent) + '<br>' + node[1].parse_html();
      }
    } else {
      res = node.parse(indent)
      output.innerHTML = node.parse_html(indent);
    }
    showLineNumbers(output.parentElement);
  }
  
  let input = document.getElementById('input');
  let output = document.getElementById('output');
  
  const s = window.localStorage;
  let x;
  let indent = 2;
  let res;
  if (x = s.getItem('indent')) {
    if (x == 'null') indent = null;
    else indent = parseInt(x);
  }
  if (x = s.getItem('input')) {
    input.value = x;
    make_output()
  }
  
  $$('.editor').forEach(editor => {
    showLineNumbers(editor);
    let textarea = editor.querySelector('.input')
    const textareaStyles = window.getComputedStyle(textarea);
    [
      'fontFamily', 'fontSize', 'fontWeight', 
      'letterSpacing', 'lineHeight',
    ].forEach(property => {
      editor.querySelector('.numbers').style[property] = textareaStyles[property];
    });
    textarea.addEventListener('scroll', () => {
      editor.querySelector('.numbers').scrollTo(0, textarea.scrollTop)
    })
  });
  
  document.addEventListener('input', (e) => {
    if (e.target.closest('#input')) make_output()
    showLineNumbers(e.target.parentElement)
  })
  
  document.addEventListener('click', e => {
    let text, node;
    switch (true) {
      case !!e.target.closest('.formatting'):
        indent = 2;
        s.setItem('indent', indent);
        make_output();
        showLineNumbers($('.output'));
        break;
        
      case !!e.target.closest('.compress'):
        indent = null;
        s.setItem('indent', indent);
        make_output()
        showLineNumbers($('.output'));
        break;
      
      case !!e.target.closest('.copy'):
        copyToClipboard(res)
        break;
      
      case !!e.target.closest('.clear'):
        input.value = '';
        output.innerHTML = '';
        s.setItem('input', '');
        s.setItem('output', '');
        $$('.editor').forEach(e => {
          showLineNumbers(e)
        });
        break;
      
      case !!e.target.closest('.collapse_btn'):
        e.target.parentElement.classList.toggle('collapse')
        break;
    }
  });
  input.addEventListener('change', () => {
    s.setItem('input', input.value);
  });
  
});
