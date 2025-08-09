const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Master Data ---
const UNIVERSITIES = [
  '東京大学', '京都大学', '大阪大学', '早稲田大学', '慶應義塾大学', '一橋大学', '東京工業大学',
  '北海道大学', '東北大学', '名古屋大学', '九州大学', '神戸大学', '筑波大学', '広島大学',
  '横浜国立大学', '千葉大学', '岡山大学', '金沢大学', '熊本大学', '長崎大学', '新潟大学',
  '信州大学', '静岡大学', '滋賀大学', '和歌山大学', '愛媛大学', '香川大学', '高知大学',
  '徳島大学', '佐賀大学', '大分大学', '宮崎大学', '鹿児島大学', '琉球大学', '国際基督教大学',
  '上智大学', '同志社大学', '立命館大学', '関西大学', '関西学院大学', '明治大学', '青山学院大学',
  '立教大学', '中央大学', '法政大学', '東洋大学', '駒澤大学', '専修大学',
  '近畿大学', '龍谷大学', '甲南大学', '京都産業大学', '中京大学', '南山大学', '福岡大学',
  '西南学院大学', '学習院大学', '成蹊大学', '成城大学', '武蔵大学', '獨協大学', '國學院大學',
  '武蔵野大学', '東京農業大学', '東京理科大学', '芝浦工業大学', '日本女子大学', '東京女子大学',
  '津田塾大学', '聖心女子大学', '白百合女子大学', 'フェリス女学院大学', '共立女子大学',
  '大妻女子大学', '実践女子大学', '昭和女子大学', '東京家政大学', '文化学園大学',
  '日本体育大学', '順天堂大学', '帝京大学', '国士舘大学', '拓殖大学',
  '神奈川大学', '玉川大学', '創価大学', '明星大学', '桜美林大学', '文教大学', '麗澤大学',
  '城西大学', '東京経済大学', '武蔵野美術大学', '多摩美術大学', '日本歯科大学',
  '東京医科大学', '日本医科大学', '東京慈恵会医科大学', '昭和大学', '東邦大学',
  '杏林大学', '聖マリアンナ医科大学',
  '北里大学', '埼玉医科大学', '獨協医科大学', '自治医科大学', '産業医科大学',
  '藤田医科大学', '愛知医科大学', '大阪医科薬科大学', '関西医科大学', '兵庫医科大学',
  '川崎医科大学', '久留米大学',
  '旭川医科大学', '札幌医科大学', '弘前大学', '秋田大学', '山形大学',
  '福島県立医科大学', '群馬大学', '千葉大学', '東京医科歯科大学',
  '横浜市立大学', '新潟大学', '富山大学', '金沢大学', '福井大学',
  '山梨大学', '信州大学', '岐阜大学', '浜松医科大学', '名古屋市立大学',
  '三重大学', '滋賀医科大学', '京都府立医科大学', '大阪市立大学', '奈良県立医科大学',
  '和歌山県立医科大学', '鳥取大学', '島根大学', '岡山大学', '広島大学',
  '山口大学', '徳島大学', '香川大学', '愛媛大学', '高知大学',
  '九州大学', '佐賀大学', '長崎大学', '熊本大学', '大分大学',
  '宮崎大学', '鹿児島大学', '琉球大学',
];
const GENRES = ['運動系（球技）', '運動系（球技以外）', 'アウトドア系', '文化系', '芸術・芸能', '音楽系', '学問系', 'ボランティア', 'イベント', 'オールラウンド', 'その他'];
const FEATURES = ['ワイワイ', '真剣', '初心者歓迎', '友達作り重視', 'イベント充実', '勉強サポート', '国際交流', 'アットホーム', 'スポーツ志向'];
const FREQUENCIES = ['週１回', '週２回', '週３回', '月１回', '不定期'];
const MEMBERS_OPTIONS = ['1-10人', '11-30人', '31-50人', '51-100人', '100人以上'];
const GENDER_RATIO_OPTIONS = ['男性多め', '女性多め', '半々'];

// --- Helper Functions ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = (arr, minCount = 2, maxCount = 4) => {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  return shuffled.slice(0, count);
};

// --- Circle Name Generation ---
const nameParts1 = ['青空', '太陽', '星空', '月光', '若葉', '桜', '楓', '疾風', '流星', '銀河', '未来', '希望', '夢', '冒険', '探求', '創造', '自由', '情熱', '友情', '絆'];
const nameParts2 = ['テニス', 'サッカー', 'バスケ', 'バレー', '野球', '陸上', '水泳', 'ダンス', '音楽', '美術', '写真', '映画', '演劇', '料理', '旅行', 'ゲーム', 'プログラミング', '国際交流', 'ボランティア', 'ディベート'];
const nameParts3 = ['クラブ', 'サークル', '同好会', '研究会', '部', 'チーム', 'プロジェクト', 'ネットワーク', 'コミュニティ', 'ギルド', '連盟', '協会'];

const generateCircleName = () => {
  const part1 = getRandomElement(nameParts1);
  const part2 = getRandomElement(nameParts2);
  const part3 = getRandomElement(nameParts3);
  return `${part1}${part2}${part3}`;
};

// --- Main Function ---
const generateDummyData = async (count) => {
  console.log(`Generating ${count} dummy circles...`);
  const batch = db.batch();

  for (let i = 0; i < count; i++) {
    const circleRef = db.collection('circles').doc(); // Auto-generate ID

    const dummyCircle = {
      name: generateCircleName(),
      university: getRandomElement(UNIVERSITIES),
      genre: getRandomElement(GENRES),
      features: getRandomSubset(FEATURES, 2, 4),
      frequency: getRandomElement(FREQUENCIES),
      members: getRandomElement(MEMBERS_OPTIONS),
      genderRatio: getRandomElement(GENDER_RATIO_OPTIONS),
      description: `これは${generateCircleName()}の活動内容を説明するサンプルテキストです。私たちは毎週${getRandomElement(FREQUENCIES)}、${getRandomElement(UNIVERSITIES)}で活動しています。主な活動は${getRandomElement(nameParts2)}で、${getRandomElement(FEATURES)}な雰囲気が特徴です。初心者も大歓迎です！`,
      accountImage: `https://picsum.photos/seed/${Math.random()}/100/100`, // ダミー画像URL
      thumbnailImage: `https://picsum.photos/seed/${Math.random()}/400/200`, // ダミー画像URL
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(circleRef, dummyCircle);
  }

  try {
    await batch.commit();
    console.log(`Successfully created ${count} dummy circles.`);
  } catch (error) {
    console.error("Error creating dummy data: ", error);
  }
};

// 記事データのサンプル
const sampleArticles = [
  {
    id: 'article1',
    title: 'クルカツ新機能',
    subtitle: 'サークル管理機能',
    date: '2024年12月',
    createdAt: new Date('2024-12-01'),
    paragraph1: 'クルカツに新しいサークル管理機能が追加されました。',
    paragraph2: 'この機能により、サークルの運営がより簡単になりました。',
    paragraph3: '主な機能：\n• メンバー管理\n• スケジュール管理\n• 連絡機能\n• 設定管理',
    paragraph4: 'これらの機能を活用して、より良いサークル運営を目指しましょう。',
    imageFiles: ['image1.jpg', 'image2.jpg']
  },
  {
    id: 'article2',
    title: '学生向けイベント',
    subtitle: 'キャリア支援セミナー',
    date: '2024年12月',
    createdAt: new Date('2024-12-02'),
    paragraph1: '学生向けキャリア支援セミナーを開催いたします。',
    paragraph2: 'このセミナーでは、就職活動に役立つ情報を提供します。',
    paragraph3: 'セミナー内容：\n• 就職活動の流れ\n• エントリーシートの書き方\n• 面接対策\n• 企業研究の方法',
    paragraph4: '参加費は無料です。多くの学生の参加をお待ちしています。',
    imageFiles: ['seminar1.jpg', 'seminar2.jpg']
  },
  {
    id: 'article3',
    title: 'サークル紹介',
    subtitle: '人気サークル特集',
    date: '2024年12月',
    createdAt: new Date('2024-12-03'),
    paragraph1: '今月の人気サークル特集をお届けします。',
    paragraph2: '様々なジャンルのサークルを紹介しています。',
    paragraph3: '特集サークル：\n• 運動系サークル\n• 文化系サークル\n• 音楽系サークル\n• ボランティア系サークル',
    paragraph4: 'これらのサークルに興味がある方は、ぜひ参加してみてください。',
    imageFiles: ['circle1.jpg', 'circle2.jpg']
  }
];

// 記事データをFirestoreに追加する関数（管理者用）
const addSampleArticles = async () => {
  const { db } = require('./firebaseConfig');
  const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
  
  for (const article of sampleArticles) {
    try {
      await addDoc(collection(db, 'articles'), {
        title: article.title,
        subtitle: article.subtitle,
        date: article.date,
        createdAt: serverTimestamp(),
        paragraph1: article.paragraph1,
        paragraph2: article.paragraph2,
        paragraph3: article.paragraph3,
        paragraph4: article.paragraph4,
        imageFiles: article.imageFiles
      });
      console.log(`記事 "${article.title}" を追加しました`);
    } catch (error) {
      console.error(`記事 "${article.title}" の追加に失敗:`, error);
    }
  }
};

module.exports = { addSampleArticles };

// --- Execution ---
const DUMMY_DATA_COUNT = 500; // 作成したいダミーデータの件数
generateDummyData(DUMMY_DATA_COUNT);