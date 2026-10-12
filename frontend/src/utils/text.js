/**
 * Tiện ích giải mã HTML Entities và xử lý chuỗi văn bản cho Storefront
 */
export const giaiMaHtmlEntities = (str) => {
  if (!str) return '';

  const entityMap = {
    '&aacute;': 'á', '&agrave;': 'à', '&atilde;': 'ã', '&acirc;': 'â',
    '&eacute;': 'é', '&egrave;': 'è', '&ecirc;': 'ê',
    '&iacute;': 'í', '&igrave;': 'ì',
    '&oacute;': 'ó', '&ograve;': 'ò', '&ocirc;': 'ô', '&otilde;': 'õ',
    '&uacute;': 'ú', '&ugrave;': 'ù',
    '&yacute;': 'ý',
    '&Aacute;': 'Á', '&Agrave;': 'À', '&Atilde;': 'Ã', '&Acirc;': 'Â',
    '&Eacute;': 'É', '&Egrave;': 'È', '&Ecirc;': 'Ê',
    '&Iacute;': 'Í', '&Igrave;': 'Ì',
    '&Oacute;': 'Ó', '&Ograve;': 'Ò', '&Ocirc;': 'Ô', '&Otilde;': 'Õ',
    '&Uacute;': 'Ú', '&Ugrave;': 'Ù',
    '&Yacute;': 'Ý',
    '&ETH;': 'Đ', '&eth;': 'đ',
    '&nbsp;': ' ',
    '&ldquo;': '"', '&rdquo;': '"',
    '&lsquo;': '\'', '&rsquo;': '\'',
    '&hellip;': '...',
    '&ndash;': '-', '&mdash;': '—'
  };

  let res = str;
  for (const [k, v] of Object.entries(entityMap)) {
    res = res.split(k).join(v);
  }

  // Dùng textarea của trình duyệt để giải mã mọi entity còn lại
  if (typeof document !== 'undefined' && res.includes('&') && res.includes(';')) {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = res;
      res = txt.value;
    } catch {
      // Giữ nguyên nếu trình duyệt không hỗ trợ DOM parser
    }
  }

  return res.replace(/&amp;/g, '&');
};
