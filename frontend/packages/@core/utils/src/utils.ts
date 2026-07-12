/** - No operation */
export function noop() {}

/** - Check if the value is null or undefined */
export function isNil(val: unknown): val is null | undefined {
  return val === null || val === undefined;
}

/**
 * 检查传入的字符串是否为有效的HTTP或HTTPS URL。
 *
 * @param {string} url 要检查的字符串。
 * @returns {boolean} 如果字符串是有效的HTTP或HTTPS URL，返回true，否则返回false。
 */
export function isHttpUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  // 使用正则表达式测试URL是否以http:// 或 https:// 开头
  const httpRegex = /^https?:\/\/.*$/;
  return httpRegex.test(url);
}

/**
 * 检查传入的值是否为window对象。
 *
 * @param {any} value 要检查的值。
 * @returns {boolean} 如果值是window对象，返回true，否则返回false。
 */
export function isWindow(value: any): value is Window {
  return typeof window !== 'undefined' && value !== null && value === value.window;
}

/**
 * 检查当前运行环境是否为Mac OS。
 *
 * 这个函数通过检查navigator.userAgent字符串来判断当前运行环境。 如果userAgent字符串中包含"macintosh"或"mac os x"（不区分大小写），则认为当前环境是Mac OS。
 *
 * @returns {boolean} 如果当前环境是Mac OS，返回true，否则返回false。
 */
export function isMacOs(): boolean {
  const macRegex = /macintosh|mac os x/i;
  return macRegex.test(navigator.userAgent);
}

/**
 * 检查当前运行环境是否为Windows OS。
 *
 * 这个函数通过检查navigator.userAgent字符串来判断当前运行环境。 如果userAgent字符串中包含"windows"或"win32"（不区分大小写），则认为当前环境是Windows OS。
 *
 * @returns {boolean} 如果当前环境是Windows OS，返回true，否则返回false。
 */
export function isWindowsOs(): boolean {
  const windowsRegex = /windows|win32/i;
  return windowsRegex.test(navigator.userAgent);
}

/**
 * 检查当前运行环境是否为PC。
 *
 * 这个函数通过检查navigator.userAgent字符串来判断当前运行环境。
 * 如果userAgent字符串中包含"Android"、"iPhone"、"webOS"、"BlackBerry"、"SymbianOS"、"Windows Phone"、"iPad"、"iPod"，则认为当前环境是PC。
 *
 * @returns {boolean} 如果当前环境是PC，返回true，否则返回false。
 */
export function isPC() {
  const agents = ['Android', 'iPhone', 'webOS', 'BlackBerry', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod'];

  const isMobile = agents.some(agent => window.navigator.userAgent.includes(agent));

  return !isMobile;
}

export function omitUndefined<T extends object>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
