
// From https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/individual/FastestTextEncoderPolyfill.src.js#L58
// CC0-1.0 license

function encoderReplacer(nonAsciiChars) {
    // make the UTF string into a binary UTF-8 encoded string
    var point = nonAsciiChars.charCodeAt(0) | 0;
    if (0xD800 <= point) {
        if (point < 0xDC00) {
            var nextcode = nonAsciiChars.charCodeAt(1) | 0; // defaults to 0 when NaN, causing null replacement character

            if (0xDC00 <= nextcode && nextcode <= 0xDFFF) {
                //point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
                point = (point << 10) + nextcode - 0x35fdc00 | 0;
                if (point > 0xffff)
                    return fromCharCode(
                        (0x1e/*0b11110*/ << 3) | (point >>> 18),
                        (0x2/*0b10*/ << 6) | ((point >>> 12) & 0x3f/*0b00111111*/),
                        (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/),
                        (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/)
                    );
            } else point = 65533/*0b1111111111111101*/;//return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
        } else if (point <= 0xDFFF) {
            point = 65533/*0b1111111111111101*/;//return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
        }
    }
    /*if (point <= 0x007f) return nonAsciiChars;
    else */if (point <= 0x07ff) {
        return fromCharCode((0x6 << 5) | (point >>> 6), (0x2 << 6) | (point & 0x3f));
    } else return fromCharCode(
        (0xe/*0b1110*/ << 4) | (point >>> 12),
        (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/),
        (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/)
    );
}


globalThis.TextEncoder.prototype.encodeInto = function (inputString, u8Arr) {
    var encodedString = inputString === void 0 ? "" : ("" + inputString).replace(/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, encoderReplacer);
    var len = encodedString.length | 0, i = 0, char = 0, read = 0, u8ArrLen = u8Arr.length | 0, inputLength = inputString.length | 0;
    if (u8ArrLen < len) len = u8ArrLen;
    putChars: {
        for (; i < len; i = i + 1 | 0) {
            char = encodedString.charCodeAt(i) | 0;
            switch (char >>> 4) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    read = read + 1 | 0;
                // extension points:
                case 8:
                case 9:
                case 10:
                case 11:
                    break;
                case 12:
                case 13:
                    if ((i + 1 | 0) < u8ArrLen) {
                        read = read + 1 | 0;
                        break;
                    }
                case 14:
                    if ((i + 2 | 0) < u8ArrLen) {
                        read = read + 1 | 0;
                        break;
                    }
                case 15:
                    if ((i + 3 | 0) < u8ArrLen) {
                        read = read + 1 | 0;
                        break;
                    }
                default:
                    break putChars;
            }
            //read = read + ((char >>> 6) !== 2) |0;
            u8Arr[i] = char;
        }
    }
    return { "written": i, "read": inputLength < read ? inputLength : read };
}