import axios from "axios";
import { addAuthorizationHeader } from "./interceptors/request";

const baseURL = import.meta.env.VITE_API_URL; // 環境変数からAPIのベースURLを取得
const api = axios.create({ baseURL }); // Axiosインスタンスを作成
api.defaults.headers.common["Content-Type"] = 'application/json'; // デフォルトのContent-Typeヘッダーを設定
api.interceptors.request.use(addAuthorizationHeader); // リクエストインターセプターを追加

export default api;

// api.post('/signup')
// 上記の様に書くとbaseURLにアクセスできる