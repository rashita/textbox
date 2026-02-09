import os
import re

def update_frontmatter_key(folder_path, old_key="log-type:", new_key="lifelog:"):
    """
    指定されたフォルダ内のすべてのMarkdownファイル (.md) を再帰的に検索し、
    フロントマター内のキーを置き換えます。

    Args:
        folder_path (str): 処理対象のフォルダパス。
        old_key (str): 置き換えたい古いキー（例: "log-type:"）。
        new_key (str): 新しいキー（例: "lifelog:"）。
    """
    
    # 処理対象ファイルカウンター
    files_processed = 0

    # フォルダ内のすべてのファイルを再帰的に走査
    for root, _, files in os.walk(folder_path):
        for file_name in files:
            if file_name.endswith(".md"):
                file_path = os.path.join(root, file_name)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except Exception as e:
                    print(f"⚠️ ファイルの読み込み中にエラーが発生しました: {file_path}. エラー: {e}")
                    continue

                # フロントマターの開始と終了を検出する正規表現
                # フロントマターは通常、ファイルの先頭の '---' で囲まれた部分です
                # re.DOTALL フラグにより、'.' が改行文字も含むようにします
                frontmatter_pattern = re.compile(r"^(---.*?---)", re.DOTALL)
                
                # フロントマター部分を検索
                match = frontmatter_pattern.search(content)

                if match:
                    frontmatter = match.group(1)
                    
                    # フロントマター内でのキーの置き換え
                    # 行頭（または空白の後）に old_key があるパターンにマッチさせます
                    # r"(\n|\A)(\s*)" の部分は、行頭またはファイルの先頭と、その後の空白（インデント）をキャプチャします
                    # re.I (IGNORECASE) フラグで大文字・小文字を区別しないようにしていますが、
                    # YAMLのキーは通常はケースセンシティブなので、ここでは使用していません。
                    
                    # 厳密なYAMLキーの置き換えパターン例：
                    # キーとコロンの間にスペースがあっても対応できるようにします
                    # r"(\n|\A)(\s*)log-type\s*:"
                    
                    # 今回は、シンプルに指定された old_key 文字列全体を置き換えます
                    new_frontmatter = frontmatter.replace(old_key, new_key)
                    
                    if new_frontmatter != frontmatter:
                        # 置き換えが行われた場合、ファイルの内容全体を更新
                        updated_content = content.replace(frontmatter, new_frontmatter, 1) # 最初の1回のみ置き換え
                        
                        try:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(updated_content)
                            print(f"✅ 更新しました: {file_path}")
                            files_processed += 1
                        except Exception as e:
                            print(f"❌ ファイルの書き込み中にエラーが発生しました: {file_path}. エラー: {e}")

                else:
                    # フロントマターが見つからない場合
                    # print(f"ℹ️ フロントマターが見つかりませんでした: {file_path}")
                    pass # 何もしない

    print("-" * 30)
    print(f"✨ 処理が完了しました。{files_processed} 個のファイルが更新されました。")


# --- 実行部分 ---
if __name__ == "__main__":
    # !!! 処理したいフォルダのパスを指定してください !!!
    # 例: スクリプトと同じディレクトリの 'notes' フォルダの場合
    # target_directory = "notes" 
    
    # 例: カレントディレクトリ全体の場合
    target_directory = "/Users/Tadanori/Library/CloudStorage/Dropbox/textbox_node/local/data/notes"
    
    # 実行
    update_frontmatter_key(target_directory)