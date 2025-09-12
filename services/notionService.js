import NOTION_CONFIG from '../config/notionConfig';

/**
 * Notion APIから記事データを取得
 * @returns {Promise<Array>} 記事データの配列
 */
export const fetchNotionArticles = async () => {
  try {
    const response = await fetch(`${NOTION_CONFIG.API_BASE_URL}/databases/${NOTION_CONFIG.DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_CONFIG.API_VERSION
      },
      body: JSON.stringify({
        filter: {
          property: '公開設定',
          checkbox: { equals: true } // 公開済みの記事のみ
        },
        sorts: [
          { property: '作成日時', direction: 'descending' } // 作成日降順
        ],
        page_size: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notion API Error:', response.status, response.statusText, errorText);
      throw new Error(`Notion API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching Notion articles:', error);
    throw error;
  }
};

/**
 * Notionデータをアプリ用に変換
 * @param {Array} notionData - Notion APIから取得したデータ
 * @returns {Array} アプリ用に変換された記事データ
 */
export const transformNotionData = (notionData) => {
  return notionData.map(page => {
    // タイトルを取得
    const title = page.properties['記事タイトル']?.title?.[0]?.text?.content || 'タイトルなし';
    
    // 作成者を取得
    const author = page.properties['作成者']?.rich_text?.[0]?.text?.content || '不明';
    
    // 公開URLを取得
    const url = page.properties['URL']?.url || page.public_url || null;
    
    // サムネイル画像を取得（filesプロパティから）
    const thumbnailUrl = page.properties['サムネイル画像']?.files?.[0]?.file?.url || 
                        page.cover?.external?.url || 
                        page.cover?.file?.url || 
                        null;
    
    // 作成日を取得
    const createdAt = page.created_time ? new Date(page.created_time) : new Date();
    
    // 公開設定を取得
    const published = page.properties['公開設定']?.checkbox || false;
    
    return {
      id: page.id,
      title,
      author,
      url,
      createdAt,
      thumbnailUrl,
      published
    };
  });
};

/**
 * 記事データを取得して変換
 * @returns {Promise<Array>} 変換された記事データ
 */
export const getArticles = async () => {
  try {
    const notionData = await fetchNotionArticles();
    return transformNotionData(notionData);
  } catch (error) {
    console.error('Error getting articles:', error);
    // エラー時は空配列を返す
    return [];
  }
};
