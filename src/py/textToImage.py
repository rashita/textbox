#!/usr/bin/env python3
#textToImage.py
import sys
from PIL import Image, ImageDraw, ImageFont
import textwrap

def extract_content_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # YAMLフロントマターと本文を分割する
        parts = content.split('---', 2) 
        if len(parts) > 2:
            # フロントマターと本文がある場合
            front_matter_raw = parts[1]
            main_content = parts[2].strip()
            return main_content
        else:
            # フロントマターがない場合
            return content.strip(), {}



vault_dir ="writing/"
note_dir = "Notes/"
note_title = "引用ストック002"
file_path=note_dir + note_title + ".md"
# テキストを読み込む

quoteBody = extract_content_from_file(vault_dir+file_path)

# 画像を作成（例として白い背景）
img = Image.new('RGB', (800, 600), color = 'white')
d = ImageDraw.Draw(img)

# 画像の最大幅と余白
max_width_px = 700
padding = 50

# フォントの設定（お好きなフォントファイルを指定）
font_path = "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc"
font_size = 40
font = ImageFont.truetype(font_path, font_size)

sample_text = 'あ' * 10
bbox = font.getmask(sample_text).getbbox()
width_ten_chars = bbox[2] - bbox[0]

# 一行に表示できるおおよその文字数を計算
max_chars_per_line = int((max_width_px - padding * 2) / (width_ten_chars / 10))
# textwrapを使ってテキストを折り返す
wrapped_text = textwrap.fill(quoteBody, width=max_chars_per_line)

# テキストを画像に描画
d.text((50, 50), wrapped_text, fill=(0, 0, 0), font=font)

# 画像を保存
img.save(note_title + '.png')
