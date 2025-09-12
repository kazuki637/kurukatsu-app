// Notion API設定
const NOTION_CONFIG = {
  // Notion Integration Token (環境変数から取得)
  API_KEY: process.env.NOTION_API_KEY || '',
  
  // 記事管理データベースID
  DATABASE_ID: '26caa8f358c7806aadc1cf4a82c3ac2f',
  
  // API エンドポイント
  API_BASE_URL: 'https://api.notion.com/v1',
  
  // API バージョン
  API_VERSION: '2022-06-28'
};

export default NOTION_CONFIG;