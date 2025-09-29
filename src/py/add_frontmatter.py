import os

def add_frontmatter_to_md_files(directory):
    """
    指定されたディレクトリ内のすべての.mdファイルの先頭にフロントマターを追記します。
    """
    frontmatter = "---\ntype: Daily\n---\n"
    target_directory = os.path.expanduser(directory)

    if not os.path.exists(target_directory):
        print(f"エラー: 指定されたディレクトリが存在しません。: {target_directory}")
        return

    print(f"ディレクトリ '{target_directory}' 内の.mdファイルを処理します...")

    for root, _, files in os.walk(target_directory):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # 既にフロントマターが存在するか確認（簡潔なチェック）
                    if content.strip().startswith('---'):
                        print(f"スキップ: '{file_path}' には既にフロントマターが存在するようです。")
                        continue

                    # 新しい内容を書き込み
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(frontmatter + content)
                    print(f"成功: '{file_path}' にフロントマターを追記しました。")

                except Exception as e:
                    print(f"エラー: '{file_path}' の処理中に問題が発生しました。: {e}")

if __name__ == "__main__":
    target_dir = '~/Library/Mobile Documents/iCloud~md~obsidian/Documents/writing/Diary'
    add_frontmatter_to_md_files(target_dir)