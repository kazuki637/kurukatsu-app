# KurukatsuApp

React Nativeを使用したサークル管理アプリケーションです。

## 機能

- サークルの作成・管理
- メンバー管理
- スケジュール管理
- メッセージング機能
- ユーザープロフィール管理

## セットアップ

### 前提条件

- Node.js
- npm または yarn
- Expo CLI

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd KurukatsuApp
```

2. 依存関係をインストール
```bash
npm install
```

3. Firebase設定
- `firebaseConfig.example.js`を`firebaseConfig.js`にコピー
- Firebase Consoleで取得した設定値を入力

4. アプリを起動
```bash
npx expo start
```

## 環境設定

### Firebase設定

このプロジェクトはFirebaseを使用しています。以下の手順で設定してください：

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Authentication、Firestore、Storageを有効化
3. `firebaseConfig.example.js`を`firebaseConfig.js`にコピー
4. 設定値を実際の値に置き換え

## 開発

### スクリプト

- `npm start`: 開発サーバーを起動
- `npm run android`: Androidエミュレータで実行
- `npm run ios`: iOSシミュレータで実行

## 注意事項

- `firebaseConfig.js`は機密情報を含むため、Gitにコミットされません
- 新しい開発者は`firebaseConfig.example.js`を参考に設定を行ってください

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。 