# クルカツアプリ 詳細概要書

**バージョン**: 1.1.6  
**最終更新**: 2025年10月  
**プラットフォーム**: iOS / Android (React Native / Expo)
---

## 📱 アプリの概要

**クルカツ**は、大学生向けのサークル・新歓活動マッチングプラットフォームです。

### 主な目的
- 大学生が自分に合ったサークルを簡単に見つけられる
- サークル運営者が効率的にメンバー募集・管理ができる
- サークル活動情報を一元管理し、メンバー間のコミュニケーションを促進

### ターゲットユーザー
1. **一般学生**: サークルを探している学生
2. **サークル運営者**: サークルの代表者や管理者（leader/admin）

---

## 🛠 技術スタック

### フロントエンド
- **フレームワーク**: React Native 0.81.4
- **開発環境**: Expo 54.0.12 (dev-client使用)
- **ナビゲーション**: 
  - @react-navigation/native 7.1.14
  - @react-navigation/stack 7.4.2
  - @react-navigation/bottom-tabs 7.4.2
- **状態管理**: React Hooks (useState, useEffect, useContext)
- **UI/UX**:
  - expo-linear-gradient (グラデーション)
  - lottie-react-native (アニメーション)
  - expo-haptics (触覚フィードバック)
  - react-native-modalize (モーダル)

### バックエンド
- **BaaS**: Firebase
  - Authentication (メール/パスワード認証)
  - Firestore (データベース)
  - Cloud Storage (画像保存)
  - Cloud Functions (us-central1リージョン)
- **外部API**: 
  - Notion API (記事管理・配信)
  - Expo Push Notifications (プッシュ通知)

### 画像処理
- expo-image (最適化された画像表示)
- expo-image-manipulator (画像編集・トリミング)
- expo-image-picker (画像選択)
- react-native-image-crop-picker (画像クロップ)
- 独自の画像圧縮アルゴリズム実装

### パーミッション
- カメラアクセス
- フォトライブラリアクセス
- プッシュ通知
- バックグラウンド通知

---

## 📊 データベース構造（Firestore）

### コレクション構造

#### 1. `users` コレクション
ユーザープロフィール情報

```
users/{userId}
  - uid: string
  - name: string (氏名)
  - university: string (大学名)
  - faculty: string (学部)
  - genre: string (興味のあるジャンル)
  - profileImage: string (URL)
  - email: string
  - createdAt: timestamp
  - notificationSettings: object {
      joinRequests: boolean (入会申請通知)
      contact: boolean (連絡通知)
    }
  
  サブコレクション:
  - notificationTokens/{tokenId}
      - token: string
      - createdAt: timestamp
      - platform: string (ios/android)
  
  - circleMessages/{messageId}
      - circleId: string
      - messageId: string
      - title: string
      - message: string
      - sentAt: timestamp
      - readAt: timestamp (既読時刻)
      - isRead: boolean
      
      サブコレクション:
      - reads/{readerUid}
          - readAt: timestamp
  
  - blocks/{blockedCircleId}
      - blockedAt: timestamp
      - circleId: string (ブロックされたサークルID)
```

#### 2. `circles` コレクション
サークル情報

```
circles/{circleId}
  - name: string (サークル名)
  - universityName: string (大学名)
  - genre: string (ジャンル)
  - features: array<string> (特色)
  - frequency: string (活動頻度)
  - activityDays: array<string> (活動曜日)
  - genderratio: string (男女比)
  - members: string (人数帯)
  - circleType: string (学内サークル/インカレ)
  - imageUrl: string (アイコン画像URL)
  - headerImageUrl: string (ヘッダー画像URL)
  - description: string (サークル説明)
  - activityLocation: string (活動場所)
  - contactInfo: string (連絡先)
  - leaderId: string (代表者のUID)
  - leaderName: string (代表者名)
  - createdBy: string (作成者UID)
  - createdAt: timestamp
  - likes: number (いいね数)
  
  - welcome: object {
      isRecruiting: boolean (入会募集中)
      activityPhotos: array<string> (活動写真URL)
      newMemberMessage: string (新入生へのメッセージ)
      memberBenefits: string (メンバーの特典)
    }
  
  - snsLink: string (Instagram URL)
  - xLink: string (X/Twitter URL)
  
  サブコレクション:
  - members/{memberId}
      - userId: string
      - role: string (leader/admin/member)
      - joinedAt: timestamp
      - name: string
      - profileImage: string
  
  - joinRequests/{requestId}
      - userId: string
      - userName: string
      - userEmail: string
      - requestedAt: timestamp
      - status: string (pending/approved/rejected)
      - message: string (申請メッセージ)
  
  - schedule/{scheduleId}
      - title: string
      - date: string
      - description: string
      - createdAt: timestamp
  
  - events/{eventId}
      - title: string
      - date: string
      - time: string
      - location: string
      - description: string
      - requiresAttendance: boolean (出席確認が必要か)
      - imageUrl: string
      - createdAt: timestamp
      
      サブコレクション:
      - attendance/{userId}
          - status: string (attend/absent/pending)
          - updatedAt: timestamp
  
  - messages/{messageId}
      - title: string
      - message: string
      - sentAt: timestamp
      - sentBy: string (送信者UID)
      - requiresAttendance: boolean
      
      サブコレクション:
      - readStatus/{userId}
          - readAt: timestamp
          - isRead: boolean
      
      - attendance/{userId}
          - status: string (attend/absent/pending)
          - updatedAt: timestamp
```

#### 3. `reports` コレクション
サークル通報機能

```
reports/{reportId}
  - reporterId: string (通報者UID)
  - reportedCircleId: string (通報されたサークルID)
  - reportedCircleName: string
  - reason: string (通報理由)
  - details: string (詳細)
  - createdAt: timestamp
```

#### 4. `articles` コレクション
記事情報（Notion連携）

```
articles/{articleId}
  - title: string
  - author: string
  - url: string
  - thumbnailUrl: string
  - createdAt: timestamp
  - published: boolean
```

#### 5. `inquiries` コレクション
お問い合わせ

```
inquiries/{inquiryId}
  - userId: string
  - name: string
  - email: string
  - subject: string
  - message: string
  - createdAt: timestamp
```

---

## 🎨 アプリの画面構成

### ナビゲーション構造

```
App
├─ AuthStack (未認証時)
│  ├─ OnboardingScreen (初回起動時のみ)
│  ├─ LoginScreen
│  ├─ SignupScreen
│  └─ PasswordResetScreen
│
└─ MainTabNavigator (認証後)
   ├─ ホームタブ (HomeStack)
   │  ├─ HomeScreen (ヘッダー右側にユーザーアイコン - タップでマイページへ)
   │  ├─ ArticleWebViewScreen
   │  └─ ArticleListScreen
   │
   ├─ 検索タブ (SearchStack)
   │  ├─ SearchScreen
   │  ├─ UniversitySelectionScreen
   │  ├─ GenreSelectionScreen
   │  ├─ FeatureSelectionScreen
   │  ├─ FrequencySelectionScreen
   │  ├─ MembersSelectionScreen
   │  ├─ GenderRatioSelectionScreen
   │  ├─ ActivityDaySelectionScreen
   │  └─ SearchResultsScreen
   │
   └─ サークル運営タブ (CircleManagementStack)
      ├─ CircleManagementScreen
      ├─ CircleProfileEditScreen
      ├─ CircleSettingsScreen
      ├─ CircleMemberManagementScreen
      ├─ CircleScheduleManagementScreen
      ├─ CircleContactScreen
      └─ CircleLeadershipTransferScreen
```

### 共通スタック (SharedStack - モーダル表示)
```
共通画面
├─ CircleProfileScreen (サークル詳細)
├─ CircleEventDetailScreen (イベント詳細)
├─ CircleMessageDetailScreen (連絡詳細)
├─ CircleMemberScreen (メンバー向けサークル画面)
├─ CircleMemberScheduleScreen (メンバー向けスケジュール)
├─ CircleMemberContactScreen (メンバー向け連絡一覧)
├─ CircleMemberMemberListScreen (メンバーリスト)
├─ ReportScreen (通報画面)
├─ BlockManagementScreen (ブロック管理)
├─ ProfileEditScreen (プロフィール編集)
├─ SearchResultsScreen (検索結果)
├─ MyPageScreen (マイページ - ホームアイコンからアクセス)
├─ NotificationSettingsScreen (通知設定)
├─ HelpScreen (ヘルプ)
├─ TermsOfServiceScreen (利用規約)
├─ PrivacyPolicyScreen (プライバシーポリシー)
└─ SettingScreen (設定)
```

### ルートレベルモーダル
```
グローバルモーダル
├─ ImageCropScreen (画像クロップ)
├─ StudentIdCameraScreen (学生証撮影)
└─ CircleRegistrationScreen (サークル登録)
```

---

## 🎯 主要機能の詳細

### 1. ユーザー認証機能
- **新規登録**: メールアドレス + パスワード
- **ログイン**: メールアドレス + パスワード
- **パスワードリセット**: メール送信による再設定
- **プロフィール設定**: 
  - 氏名、大学名、学部、興味のあるジャンル
  - プロフィール画像（画像圧縮・最適化あり）
  - 学生証による本人確認（将来実装予定）

### 2. ホーム画面機能 (HomeScreen)
**主要セクション**:

#### a) ユーザー情報表示
- プロフィール画像とユーザー名表示
- 大学名表示

#### b) 所属サークル一覧
- 所属しているサークルを横スクロールカード形式で表示
- カードタップでサークルメンバー画面（CircleMemberScreen）に遷移
- 未読連絡数のバッジ表示
- リアルタイム更新機能

#### c) 人気のサークル
- いいね数（likes）が多いサークルを表示
- 最大6件表示
- タップでサークル詳細画面に遷移

#### d) 新着サークル
- 最近登録されたサークルを表示
- 作成日時（createdAt）降順
- 最大6件表示
- タップでサークル詳細画面に遷移

#### e) クルカツからのお知らせ
- Notion APIから記事を取得
- サムネイル画像付きカード表示
- タップで記事WebView画面に遷移

**実装の特徴**:
- リアルタイム更新（onSnapshot使用）
- 画像プリロード機能
- ブロック機能との連携（ブロックしたサークルを非表示）
- キャッシュ機能（パフォーマンス最適化）

### 3. 検索機能 (SearchScreen)
**検索フィルタ**:
- フリーワード検索（サークル名、説明文、活動場所、大学名）
- 大学名フィルタ（複数選択可）
- ジャンルフィルタ（単一選択）
- 特色フィルタ（複数選択可）
- 活動頻度フィルタ（複数選択可）
- 人数フィルタ（複数選択可）
- 男女比フィルタ（複数選択可）
- 活動曜日フィルタ（複数選択可）
- サークル種別フィルタ（学内サークル/インカレ）

**実装の特徴**:
- リアルタイムフィルタリング（useMemo使用）
- キャッシュ機能（5分間有効）
- グリッド表示
- タップでサークル詳細画面に遷移

### 4. サークル詳細画面 (CircleProfileScreen)
**タブ構成**:
1. **トップタブ**:
   - サークル基本情報
   - ヘッダー画像
   - アイコン画像
   - サークル名、大学名、ジャンル
   - SNSリンク（Instagram, X/Twitter）
   - 特色、活動頻度、活動曜日、人数、男女比
   - 活動場所、サークル説明

2. **新歓情報タブ**:
   - 入会募集状況
   - 活動写真（最大4枚）
   - 新入生へのメッセージ
   - メンバーの特典

**アクション**:
- お気に入り登録/解除
- 入会申請（ボタン）
- サークル通報
- サークルブロック

**権限管理**:
- 一般ユーザー: 閲覧、お気に入り、入会申請、通報、ブロック
- メンバー: 閲覧 + メンバー専用画面へのアクセス
- 管理者: 編集権限

### 5. サークル運営機能 (CircleManagementScreen)
**管理サークル切り替え**:
- 自分が運営するサークルを切り替え
- サークルごとの管理画面にアクセス

**管理メニュー**:
1. **新歓プロフィール編集**:
   - 基本情報編集
   - 画像アップロード（アイコン、ヘッダー、活動写真）
   - SNSリンク設定

2. **メンバー管理** (CircleMemberManagementScreen):
   - タブ構成:
     - メンバー一覧タブ
     - 入会申請タブ（未読バッジ表示）
   - 機能:
     - メンバーの役割変更（leader/admin/member）
     - メンバー削除
     - 入会申請の承認/拒否
     - リアルタイム更新

3. **連絡送信** (CircleContactScreen):
   - タイトル、本文入力
   - 出席確認オプション
   - 全メンバーへプッシュ通知送信
   - 連絡履歴の確認

4. **カレンダー作成** (CircleScheduleManagementScreen):
   - スケジュール追加/編集/削除
   - 日付、タイトル、説明入力
   - イベント作成機能
   - イベントには出席確認機能あり

5. **代表者引き継ぎ** (CircleLeadershipTransferScreen):
   - 代表者権限の譲渡
   - メンバーリストから選択
   - leader権限のみ実行可能

6. **サークル設定** (CircleSettingsScreen):
   - サークル削除
   - 基本設定変更

### 6. メンバー向けサークル画面 (CircleMemberScreen)
**タブ構成**:
1. **トップタブ**:
   - サークル基本情報表示
   - イベント一覧

2. **連絡タブ**:
   - サークルからの連絡一覧
   - 未読/既読表示
   - 未読数バッジ
   - タップで連絡詳細画面へ

3. **カレンダータブ**:
   - サークルのスケジュール表示
   - 日付順表示

4. **メンバータブ**:
   - メンバー一覧表示
   - 役割表示（代表者/管理者/メンバー）
   - プロフィール画像表示

**アクション**:
- サークル退会
- メンバー一覧表示
- 通知設定（このサークルの通知をオフ）

### 7. マイページ機能 (MyPageScreen)
**セクション**:
1. **プロフィール表示**:
   - プロフィール画像
   - 氏名、大学名、学部
   - 興味のあるジャンル

2. **プロフィール編集**:
   - タップでProfileEditScreenに遷移
   - 画像変更、情報編集

3. **通知設定**:
   - 入会申請通知のON/OFF
   - 連絡通知のON/OFF

4. **その他メニュー**:
   - ブロック管理
   - ヘルプ
   - 利用規約
   - プライバシーポリシー
   - ログアウト
   - アカウント削除

### 8. プッシュ通知機能
**通知タイプ**:
1. **入会申請通知**:
   - サークル管理者に送信
   - タップで入会申請タブに直接遷移

2. **連絡通知**:
   - サークルメンバーに送信
   - タップで連絡詳細画面に直接遷移
   - 未読数のリアルタイム更新

**実装の特徴**:
- Expo Push Notifications使用
- Firestore通知トークン管理
- 通知設定による配信制御
- バックグラウンド通知対応
- フォアグラウンド通知表示
- 通知タップ時のディープリンク
- 重複通知防止機構

### 9. 画像処理機能
**画像圧縮**:
- プロフィール画像: 512x512px、品質0.8
- サークルアイコン: 512x512px、品質0.8
- サークルヘッダー: 1280x720px、品質0.8
- 活動写真: 1024x1024px、品質0.8

**画像クロップ**:
- カスタムクロップ画面（ImageCropScreen）
- ガイドライン付きインターフェース
- プレビュー機能

**画像プリロード**:
- アプリ起動時にアセット画像をプリロード
- ユーザー画像のキャッシュ
- スプラッシュ画面での事前読み込み

### 10. ブロック機能
**機能**:
- サークルをブロック
- ブロックしたサークルを非表示
- ブロック解除

**影響範囲**:
- ホーム画面の表示
- 検索結果の表示
- サークル詳細画面へのアクセス制限

### 11. お気に入り機能
- サークルをお気に入りに追加/削除
- マイページで確認
- リアルタイム同期

### 12. いいね機能
- サークルにいいね
- いいね数の表示
- 人気サークルランキングに影響

### 13. 記事配信機能
**Notion連携**:
- Notion APIからデータ取得
- 公開設定された記事のみ表示
- サムネイル画像、タイトル、作成者、作成日
- WebView表示（ArticleWebViewScreen）

### 14. サークル登録フロー (CircleRegistrationScreen)
**ステップバイステップ登録**:
1. サークルアイコン選択
2. サークル種別選択（学内サークル/インカレ）
3. サークル名入力
4. ジャンル選択
5. 特色選択（複数可）
6. 活動頻度選択
7. 活動曜日選択（複数可）
8. 人数選択
9. 男女比選択
10. 入会募集状況設定

**自動取得データ**:
- 大学名（ユーザープロフィールから）
- 連絡先（ユーザーメールアドレス）
- 代表者名（ユーザー名）

**登録後の処理**:
- Firestoreにサークルデータ作成
- メンバーコレクションに代表者を自動追加（role: leader）
- サークル運営タブに自動追加

---

## 🔐 権限管理

### ユーザーロール
1. **一般ユーザー（未所属）**:
   - サークル閲覧
   - サークル検索
   - お気に入り登録
   - 入会申請
   - サークル通報
   - サークルブロック

2. **メンバー（member）**:
   - 一般ユーザー権限 +
   - サークルメンバー画面へのアクセス
   - 連絡の閲覧
   - スケジュール閲覧
   - イベント出席確認
   - サークル退会

3. **管理者（admin）**:
   - メンバー権限 +
   - サークル情報編集
   - メンバー管理
   - 連絡送信
   - スケジュール管理
   - イベント作成

4. **代表者（leader）**:
   - 管理者権限 +
   - サークル削除
   - 代表者引き継ぎ
   - メンバーの役割変更（leader権限の付与）

### Firestore Rulesによる制御
- 認証必須（request.auth != null）
- リソースベースのアクセス制御
- ロールベースの書き込み制限
- サブコレクションの権限継承

---

## 💾 Firebase Storage構造

```
storage/
├─ profile_images/{userId}/{fileName}
│  └─ 権限: 本人のみ書き込み、認証ユーザーは全員読み取り可
│
├─ circle_images/{circleId}/
│  ├─ icons/{fileName}
│  ├─ headers/{fileName}
│  ├─ events/{fileName}
│  └─ activities/{fileName}
│     └─ 権限: 認証ユーザーは全員読み書き可
│
├─ student_ids/{fileName}
│  └─ 権限: 認証ユーザーは全員読み書き可
│
└─ articles/{articleTitle}/
   ├─ header
   └─ images/{fileName}
      └─ 権限: 全員読み書き可
```

---

## 🎨 UI/UXの特徴

### デザインシステム
**カラーパレット**:
- プライマリカラー: #2563eb（青）
- セカンダリカラー: #f59e0b（オレンジ）
- 背景色: #f0f2f5（ライトグレー）
- テキストカラー: #1f2937（ダークグレー）
- ボーダーカラー: #e5e7eb（グレー）
- エラーカラー: #ef4444（赤）

**タイポグラフィ**:
- システムフォント使用（iOS/Android最適化）
- 見出し: 24px, bold
- サブ見出し: 18px, semibold
- 本文: 16px, regular
- キャプション: 14px, regular

**コンポーネント**:
1. **CommonHeader**:
   - 統一されたヘッダーコンポーネント
   - タイトル、戻るボタン、右側ボタン

2. **CustomTabBar**:
   - カスタムタブバー
   - 未読バッジ表示対応
   - アイコン + テキスト表示

3. **KurukatsuButton**:
   - 統一されたボタンコンポーネント
   - サイズバリエーション（small/medium/large）
   - スタイルバリエーション（primary/secondary/outline）
   - ローディング状態
   - 無効化状態
   - 触覚フィードバック対応

4. **ImageCropPicker**:
   - 画像選択 + クロップ機能
   - ガイドライン表示

### アニメーション
- Lottieアニメーション使用
- タブ切り替えアニメーション
- ボタンのフィードバックアニメーション
- スケルトンローディング

### ユーザビリティ
- タップ時の触覚フィードバック（expo-haptics）
- ローディング状態の明示
- エラーハンドリングとユーザーフィードバック
- 画像の遅延読み込み
- 無限スクロール対応
- プルトゥリフレッシュ

---

## 📱 画面詳細リスト（全42画面）

**注意**: マイページはタブから削除され、ホーム画面ヘッダーのユーザーアイコンからアクセスする仕様に変更されました。

### 認証関連（3画面）
1. **OnboardingScreen**: 初回起動時のオンボーディング
2. **LoginScreen**: ログイン画面
3. **SignupScreen**: 新規登録画面
   - プロフィール情報入力
   - 大学選択
   - ジャンル選択
4. **PasswordResetScreen**: パスワードリセット

### ホームタブ（3画面）
5. **HomeScreen**: ホーム画面
   - 所属サークル一覧
   - 人気のサークル
   - 新着サークル
   - クルカツからのお知らせ
   - ヘッダー右側：ユーザーアイコン（タップでマイページへ遷移）
6. **ArticleWebViewScreen**: 記事WebView表示
7. **ArticleListScreen**: 記事一覧

### 検索タブ（9画面）
8. **SearchScreen**: 検索画面
   - フリーワード検索
   - フィルタ選択ボタン
9. **UniversitySelectionScreen**: 大学選択
10. **GenreSelectionScreen**: ジャンル選択
11. **FeatureSelectionScreen**: 特色選択
12. **FrequencySelectionScreen**: 活動頻度選択
13. **MembersSelectionScreen**: 人数選択
14. **GenderRatioSelectionScreen**: 男女比選択
15. **ActivityDaySelectionScreen**: 活動曜日選択
16. **SearchResultsScreen**: 検索結果表示

### マイページ関連画面（6画面 - 共通スタック経由でアクセス）
17. **MyPageScreen**: マイページ（ホーム画面のヘッダーアイコンからアクセス）
    - プロフィール表示
    - 所属サークル一覧
    - お気に入りサークル一覧
18. **ProfileEditScreen**: プロフィール編集
19. **NotificationSettingsScreen**: 通知設定
20. **SettingScreen**: 設定画面
21. **HelpScreen**: ヘルプ
22. **TermsOfServiceScreen**: 利用規約
23. **PrivacyPolicyScreen**: プライバシーポリシー

### サークル運営タブ（7画面）
24. **CircleManagementScreen**: サークル運営トップ
    - 管理サークル切り替え
    - 管理メニュー
25. **CircleProfileEditScreen**: サークルプロフィール編集
    - 基本情報編集
    - 画像アップロード
    - 新歓情報編集
26. **CircleMemberManagementScreen**: メンバー管理
    - メンバー一覧
    - 入会申請管理
27. **CircleContactScreen**: 連絡送信
28. **CircleScheduleManagementScreen**: スケジュール管理
29. **CircleSettingsScreen**: サークル設定
30. **CircleLeadershipTransferScreen**: 代表者引き継ぎ

### サークル詳細・メンバー向け（7画面）
31. **CircleProfileScreen**: サークル詳細（一般ユーザー向け）
    - トップタブ
    - 新歓情報タブ
32. **CircleMemberScreen**: サークル画面（メンバー向け）
    - トップタブ
    - 連絡タブ
    - カレンダータブ
    - メンバータブ
33. **CircleMemberScheduleScreen**: スケジュール詳細（メンバー向け）
34. **CircleMemberContactScreen**: 連絡一覧（メンバー向け）
35. **CircleMemberMemberListScreen**: メンバー一覧
36. **CircleEventDetailScreen**: イベント詳細
    - 出席確認機能
37. **CircleMessageDetailScreen**: 連絡詳細
    - 既読機能
    - 出席確認機能

### その他機能画面（5画面）
38. **CircleRegistrationScreen**: サークル登録
    - ステップバイステップ入力
39. **ReportScreen**: サークル通報
40. **BlockManagementScreen**: ブロック管理
41. **ImageCropScreen**: 画像クロップ
42. **StudentIdCameraScreen**: 学生証撮影

---

## 🔄 主要なユーザーフロー

### 1. 新規ユーザー登録フロー
```
OnboardingScreen
  ↓
SignupScreen
  ↓ (メールアドレス・パスワード入力)
UniversitySelectionScreen
  ↓ (大学選択)
GenreSelectionScreen
  ↓ (ジャンル選択)
ProfileEditScreen
  ↓ (プロフィール情報入力・画像アップロード)
HomeScreen
```

### 2. サークル検索・入会申請フロー
```
SearchScreen
  ↓ (フィルタ設定)
SearchResultsScreen
  ↓ (サークルタップ)
CircleProfileScreen
  ↓ (入会申請ボタンタップ)
入会申請送信
  ↓
サークル管理者に通知
  ↓
管理者が承認/拒否
  ↓
承認されたらCircleMemberScreenにアクセス可能
```

### 3. サークル登録フロー
```
HomeScreen
  ↓ (サークル登録ボタンタップ)
CircleRegistrationScreen (10ステップ)
  1. アイコン選択
  2. サークル種別選択
  3. サークル名入力
  4. ジャンル選択
  5. 特色選択
  6. 活動頻度選択
  7. 活動曜日選択
  8. 人数選択
  9. 男女比選択
  10. 入会募集状況設定
  ↓
サークル登録完了
  ↓
CircleManagementScreenにサークル追加
```

### 4. サークル連絡送信フロー
```
CircleManagementScreen
  ↓ (連絡送信ボタンタップ)
CircleContactScreen
  ↓ (タイトル・本文入力)
連絡送信
  ↓
全メンバーにプッシュ通知
  ↓
メンバーの通知タップ
  ↓
CircleMessageDetailScreen
  ↓
既読状態を更新
```

### 5. 入会申請管理フロー
```
入会申請受信
  ↓
管理者にプッシュ通知
  ↓
通知タップ
  ↓
CircleMemberManagementScreen (入会申請タブ)
  ↓
承認/拒否
  ↓
承認の場合: メンバーコレクションに追加
拒否の場合: 入会申請を削除
```

---

## 🌐 外部サービス連携

### 1. Notion API
- **用途**: 記事配信
- **データ取得**: 公開設定された記事のみ
- **更新頻度**: リアルタイム（API呼び出し時）
- **データ構造**: 
  - 記事タイトル
  - 作成者
  - サムネイル画像
  - 公開URL
  - 作成日時

### 2. Expo Push Notifications
- **用途**: プッシュ通知配信
- **トークン管理**: Firestoreに保存
- **送信方法**: EAS Push Service経由
- **通知タイプ**: 
  - 入会申請通知
  - サークル連絡通知

### 3. Firebase Authentication
- **認証方法**: メールアドレス + パスワード
- **セッション管理**: AsyncStorage使用
- **パスワードリセット**: メール送信

### 4. Firebase Cloud Functions
- **リージョン**: us-central1
- **用途**: バックエンド処理（将来実装予定）

---

## 📊 パフォーマンス最適化

### 1. 画像最適化
- expo-imageによる最適化表示
- メモリ・ディスクキャッシュ
- 画像プリロード
- 圧縮処理

### 2. データ取得最適化
- Firestoreスナップショットリスナー
- キャッシュ機能（5分間有効）
- リアルタイム更新の最小化

### 3. レンダリング最適化
- React.memo使用
- useMemo, useCallback使用
- FlatListの最適化（initialNumToRender, maxToRenderPerBatch）
- lazyプレースホルダー

### 4. ナビゲーション最適化
- lazyロード
- gestureEnabled設定
- アニメーション最適化

---

## 🐛 エラーハンドリング

### 1. ネットワークエラー
- タイムアウト処理
- リトライ機能
- ユーザーへのフィードバック

### 2. 認証エラー
- セッション期限切れ検知
- 自動ログアウト
- 再認証プロンプト

### 3. データ取得エラー
- フォールバック表示
- エラーメッセージ表示
- リロード機能

### 4. 画像アップロードエラー
- 進捗状況表示
- エラー時のリトライ
- ファイルサイズチェック

---

## 🔒 セキュリティ

### 1. Firestore Rules
- 認証必須
- リソースベースアクセス制御
- ロールベースの書き込み制限

### 2. Storage Rules
- 認証必須（一部を除く）
- パス制限
- ファイルタイプ検証

### 3. データ検証
- フロントエンドでの入力検証
- Firestore Rulesでのバリデーション

### 4. プライバシー
- 個人情報の適切な管理
- ブロック機能
- 通報機能

---

## 📈 今後の拡張予定

### 機能追加
1. チャット機能（メンバー間）
2. イベント出席率の統計表示
3. サークル推薦アルゴリズム
4. ソーシャルログイン（Google, Apple）
5. 学生証認証機能の完全実装
6. サークル間のコラボレーション機能

### 技術的改善
1. オフライン対応
2. パフォーマンスモニタリング
3. A/Bテスト機能
4. アナリティクス統合
5. エラー追跡（Sentry等）

---

## 🎯 主要な技術的課題と解決策

### 1. リアルタイム更新の管理
**課題**: 複数画面で同時にリアルタイム更新を管理
**解決策**: グローバル状態管理関数を使用し、画面間でデータを同期

### 2. 画像の最適化
**課題**: 大量の画像読み込みによるパフォーマンス低下
**解決策**: 
- expo-imageのキャッシュ機能
- 画像圧縮アルゴリズム
- プリロード機能

### 3. 通知の重複防止
**課題**: 同じ通知が複数回処理される
**解決策**: 通知IDをSetで管理し、重複をチェック

### 4. キャッシュ管理
**課題**: 古いデータが表示される
**解決策**: 
- タイムスタンプベースのキャッシュ無効化
- 手動キャッシュクリア機能
- 適切なキャッシュ期間設定（5分）

---

## 📱 アプリ設定情報

### iOS
- **Bundle Identifier**: com.kurukatsu.app
- **Build Number**: 16
- **最小OSバージョン**: iOS 13.0以降
- **対応デバイス**: iPhone, iPad

### Android
- **Package Name**: com.kurukatsu.app
- **Version Code**: 1
- **最小SDKバージョン**: 21 (Android 5.0)
- **ターゲットSDKバージョン**: 33 (Android 13)

### EAS設定
- **Project ID**: f94b703e-f3c4-4f9f-8bb5-8b53bf7ac727
- **Owner**: kazuki637
- **Runtime Version**: 1.1.5
- **Updates URL**: https://u.expo.dev/f94b703e-f3c4-4f9f-8bb5-8b53bf7ac727

---

## 📚 重要なユーティリティ・ヘルパー

### 1. imageCompression.js
- サークル画像圧縮
- プロフィール画像圧縮
- サイズとクオリティの最適化

### 2. imagePreloader.js
- アセット画像のプリロード
- ユーザー画像のプリロード
- スプラッシュ画面での初期化

### 3. notificationUtils.js
- プッシュ通知トークン管理
- 通知送信機能
- 通知設定チェック

### 4. permissionUtils.js
- カメラ権限チェック
- フォトライブラリ権限チェック
- 通知権限チェック

### 5. imageCrop.js
- 画像クロップ処理
- アスペクト比計算
- 座標変換

---

## 🎨 カスタムコンポーネント詳細

### 1. CommonHeader
**Props**:
- title: string (ヘッダータイトル)
- leftButton: ReactElement (左側ボタン、デフォルトは戻るボタン)
- rightButton: ReactElement (右側ボタン)
- onLeftButtonPress: function (左ボタン押下時の処理)
- backgroundColor: string (背景色)

### 2. CustomTabBar
**Props**:
- state: NavigationState (ナビゲーション状態)
- descriptors: object (タブ情報)
- navigation: Navigation (ナビゲーションオブジェクト)

**機能**:
- アクティブタブの強調表示
- 未読バッジ表示（サークル運営タブ）
- タップ時のフィードバック

### 3. KurukatsuButton
**Props**:
- title: string (ボタンテキスト)
- onPress: function (押下時の処理)
- variant: 'primary' | 'secondary' | 'outline'
- size: 'small' | 'medium' | 'large'
- disabled: boolean
- loading: boolean
- hapticFeedback: boolean (触覚フィードバックON/OFF)
- style: ViewStyle (追加スタイル)

### 4. ImageCropPicker
**Props**:
- onImageSelected: function (画像選択時のコールバック)
- aspectRatio: number (アスペクト比)
- imageType: 'profile' | 'circle' | 'header' | 'activity'
- showGuide: boolean (ガイド表示)

### 5. ImageCropGuide
**Props**:
- guideType: 'circle' | 'square' | 'rectangle'
- size: number | { width: number, height: number }

---

## 🎯 主要なカスタムフック

### 1. useFirestoreDoc
**用途**: Firestoreドキュメントのリアルタイム取得
**パラメータ**:
- collectionName: string
- documentId: string
- cacheDuration: number (秒)

**戻り値**:
- data: object (ドキュメントデータ)
- loading: boolean (ローディング状態)
- error: Error (エラー)

### 2. useNotificationBadge
**用途**: 通知バッジの未読数管理
**戻り値**:
- unreadCounts: object (サークルごとの未読数)
- isLoading: boolean
- refetch: function (再取得)

### 3. useNotificationNavigation
**用途**: 通知タップ時の画面遷移管理
**機能**:
- 通知データの解析
- 適切な画面への遷移
- パラメータの設定

---

## 📝 データモデル詳細

### ジャンルリスト
```
- スポーツ（球技）
- スポーツ（球技以外）
- アウトドア・旅行
- 文化・教養
- 芸術・芸能
- 音楽
- 学問・研究
- 趣味・娯楽
- 国際交流
- ボランティア
- イベント
- オールラウンド
- その他
```

### 特色リスト
```
- イベント充実
- 友達作り重視
- 初心者歓迎
- ゆるめ
- 真剣
- 和やか
- 賑やか
```

### 活動頻度リスト
```
- 週１回
- 週２回
- 週３回
- 月１回
- 不定期
```

### 活動曜日リスト
```
- 月曜日
- 火曜日
- 水曜日
- 木曜日
- 金曜日
- 土曜日
- 日曜日
- 不定期
```

### 男女比リスト
```
- 男性多め
- 女性多め
- 半々
```

### 人数帯リスト
```
- 1-10人
- 11-30人
- 31-50人
- 51-100人
- 100人以上
```

### サークル種別
```
- 学内サークル
- インカレ
```

---

## 🗃 大学リストデータ

**ファイル**: universities.json  
**データ数**: 約800大学  
**形式**: JSON配列

日本全国の国立大学、公立大学、私立大学を網羅したリストです。
ユーザー登録時とサークル検索時に使用されます。

---

## 🔄 グローバル状態管理

### グローバル関数
```javascript
// ブロック状態更新
global.updateBlockStatus(circleId, isBlocked)

// お気に入り状態更新
global.updateFavoriteStatus(circleId, isFavorite)

// メンバー数更新
global.updateMemberCount(circleId, count)

// 入会申請数更新
global.updateJoinRequestsCount(circleId, count)

// 未読数更新
global.updateHomeUnreadCounts(circleId, delta)
global.updateMyPageUnreadCounts(circleId, delta)
global.updateCircleMemberUnreadCounts(circleId, delta)

// メッセージ既読状態更新
global.updateMessageReadStatus(messageId, isRead)

// プロフィール更新通知
global.onProfileUpdated()

// キャッシュ無効化
global.invalidateCirclesCache()
```

### グローバル変数
```javascript
// ナビゲーション参照
navigationRef

// ブロックされたサークルID一覧
globalBlockedCircleIds

// お気に入りサークルID一覧
globalFavoriteCircleIds

// メンバー数
globalMemberCount

// 入会申請数
globalJoinRequestsCount

// 通知データ
global.pendingNotification

// サークルキャッシュ
global.circlesCache
```

---

## 📱 アプリアイコン・スプラッシュ

### アイコン
- **ファイル**: assets/icon.png
- **サイズ**: 1024x1024px
- **形式**: PNG

### アダプティブアイコン（Android）
- **ファイル**: assets/adaptive-icon.png
- **フォアグラウンド**: 1024x1024px
- **背景色**: #ffffff

### スプラッシュ画面
- **ファイル**: assets/splash-icon.png
- **背景色**: #ffffff
- **コンテンツフィット**: contain

---

## 🎨 アセット構成

### ボタンアイコン（Button-icons/）
```
- Calendar.png (カレンダー)
- Leader.png (代表者)
- Member.png (メンバー)
- Message.png (メッセージ)
- Profile.png (プロフィール)
- Setting.png (設定)
```

### SNSアイコン（SNS-icons/）
```
- Instagram_Glyph_Gradient.png
- LINE_Brand_icon.png
- X_logo-black.png
```

### アニメーション（animations/）
```
- Notification bell.json (通知ベル)
- search.json (検索)
- SocialMediaMarketing.json
```

### その他画像
```
- CircleManagement.png (サークル運営)
- HOME-Header-Title.png (ホームヘッダー)
- KP.png
- StudentIdGuide.png (学生証ガイド)
```

---

## 🌟 特筆すべき実装の工夫

### 1. 画面遷移の最適化
- 横スワイプジェスチャーの制御
- 戻るボタンのカスタマイズ
- ディープリンクによる直接遷移

### 2. リアルタイム同期
- Firestore onSnapshotによる自動更新
- グローバル状態管理関数による画面間同期
- 通知受信時の即座のUI更新

### 3. パフォーマンス最適化
- 画像プリロード（スプラッシュ画面で実行）
- FlatListの最適化設定
- useMemo/useCallbackによる不要な再レンダリング防止
- キャッシュ機能の実装

### 4. ユーザビリティ
- 触覚フィードバック（ボタン押下時）
- ローディング状態の明示
- エラーメッセージの分かりやすさ
- アニメーションによる視覚的フィードバック

### 5. 通知システム
- 通知タイプ別の処理分岐
- 通知設定による配信制御
- 通知タップ時の適切な画面遷移
- 重複通知防止機構

---

## 📊 主要な数値情報

- **総画面数**: 42画面
- **ナビゲータ数**: 6つ（Auth, Home, Search, CircleManagement, Shared, Root）
- **カスタムコンポーネント数**: 5つ
- **ユーティリティ関数数**: 5つ
- **Firestoreコレクション数**: 5つ（メインコレクション）
- **Firebase Storage パス数**: 4つ（メインパス）
- **対応大学数**: 約800大学
- **ジャンル数**: 13種類
- **特色数**: 7種類
- **サークル登録ステップ数**: 10ステップ

---

## 🎯 アプリの強み

1. **シンプルで直感的なUI**: 複雑な操作を排除し、誰でも簡単に使える
2. **リアルタイム同期**: 情報が常に最新の状態に保たれる
3. **包括的なサークル管理**: 募集から運営まで一元管理
4. **効率的な通知システム**: 重要な情報を確実に届ける
5. **柔軟な検索機能**: 多様な条件でサークルを探せる
6. **プライバシー保護**: ブロック機能、通報機能で安心
7. **最適化されたパフォーマンス**: 快適な操作感

---

## 📝 まとめ

クルカツアプリは、大学生のサークル活動を支援する包括的なプラットフォームです。

**主要な価値提供**:
- 学生: 自分に合ったサークルを簡単に見つけ、参加できる
- サークル運営者: 効率的にメンバー募集・管理ができる
- 両者: リアルタイムで情報共有し、活発なコミュニケーションが実現

**技術的特徴**:
- React Native + Expoによるクロスプラットフォーム開発
- Firebase BaaSによる高速開発とスケーラビリティ
- リアルタイム同期による最新情報の提供
- 最適化された画像処理とパフォーマンス
- ユーザビリティを重視したUI/UX

このアプリは、大学生活をより充実させ、サークル活動を活性化させることを目指しています。

---

**ドキュメント作成日**: 2025年10月14日  
**対象バージョン**: 1.1.6  
**作成者**: AI Assistant (based on codebase analysis)

---

## 📞 サポート情報

アプリ内のヘルプ画面から、以下のサポートにアクセスできます：
- よくある質問
- お問い合わせフォーム
- 利用規約
- プライバシーポリシー

---

**以上、クルカツアプリの詳細概要書でした。**

Figmaでのデザイン作業に必要な情報は網羅されているはずです。
追加で必要な情報があれば、お気軽にお問い合わせください。

