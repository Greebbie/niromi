export const KNOWN_WEBSITES: Record<string, string> = {
  'bilibili': 'https://www.bilibili.com',
  'b站': 'https://www.bilibili.com',
  'youtube': 'https://www.youtube.com',
  'twitter': 'https://twitter.com',
  'x': 'https://twitter.com',
  'github': 'https://github.com',
  'google': 'https://www.google.com',
  'baidu': 'https://www.baidu.com',
  '百度': 'https://www.baidu.com',
  'taobao': 'https://www.taobao.com',
  '淘宝': 'https://www.taobao.com',
  'jd': 'https://www.jd.com',
  '京东': 'https://www.jd.com',
  'zhihu': 'https://www.zhihu.com',
  '知乎': 'https://www.zhihu.com',
  'weibo': 'https://weibo.com',
  '微博': 'https://weibo.com',
  'douyin': 'https://www.douyin.com',
  '抖音': 'https://www.douyin.com',
  'xiaohongshu': 'https://www.xiaohongshu.com',
  '小红书': 'https://www.xiaohongshu.com',
  'netflix': 'https://www.netflix.com',
  'spotify': 'https://open.spotify.com',
  'reddit': 'https://www.reddit.com',
  'wikipedia': 'https://www.wikipedia.org',
  'chatgpt': 'https://chatgpt.com',
  'claude': 'https://claude.ai',
  'gmail': 'https://mail.google.com',
  'notion': 'https://www.notion.so',
  'figma': 'https://www.figma.com',
  'douban': 'https://www.douban.com',
  '豆瓣': 'https://www.douban.com',
  'meituan': 'https://www.meituan.com',
  '美团': 'https://www.meituan.com',
  'ctrip': 'https://www.ctrip.com',
  '携程': 'https://www.ctrip.com',
  '163': 'https://mail.163.com',
  '网易邮箱': 'https://mail.163.com',
  'leetcode': 'https://leetcode.cn',
  'stackoverflow': 'https://stackoverflow.com',
  'bing': 'https://www.bing.com',
  '必应': 'https://www.bing.com',
  'deepseek': 'https://chat.deepseek.com',
  'kaggle': 'https://www.kaggle.com',
}

export function resolveWebsite(name: string): string | null {
  const lower = name.toLowerCase().trim()
  if (KNOWN_WEBSITES[lower]) return KNOWN_WEBSITES[lower]
  if (/^https?:\/\//i.test(lower)) return lower
  if (/\.(com|org|net|io|dev|cn|co|me|app|ai|tv)$/i.test(lower)) return `https://${lower}`
  if (/^[\w-]+\.\w{2,}$/.test(lower)) return `https://${lower}`
  return null
}
