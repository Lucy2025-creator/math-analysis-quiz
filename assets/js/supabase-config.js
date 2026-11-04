/*
 * Supabase 云同步配置
 *
 * 1. 在 https://supabase.com 新建一个免费项目；
 * 2. 在 SQL Editor 运行仓库里的 supabase/schema.sql；
 * 3. 到 Project Settings → API 复制 Project URL 和 anon public key；
 * 4. 填到下面，或者直接打开站点的 #/account 页面在页面里填写。
 *
 * anon key 是公开的（受 RLS 保护），不要填 service_role key。
 */
window.MAQ_SUPABASE = {
  url: '',
  anonKey: ''
};
