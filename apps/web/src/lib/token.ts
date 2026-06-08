// Token Bearer persistido en el navegador (auth JWT/Bearer, RF-AUTH-01).
export const TOKEN_KEY = "bm_bearer_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
