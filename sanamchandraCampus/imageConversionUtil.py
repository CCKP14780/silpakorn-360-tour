from pathlib import Path

folder_path = Path('sanamchandraCampus/img/stillImages')
file_extension = ['*.690Z','*.691Z']

def convert_files_to_jpg(folder_path, file_extension):
    for ext in file_extension:
        for file_path in folder_path.glob(ext):
            new_path = file_path.with_suffix('.jpg')

            try:
                file_path.rename(new_path)
                print(f'Converted {file_path} to {new_path}')
            except:
                continue

def remove_files_with_extension(folder_path, file_extension):
    for ext in file_extension:
        for file_path in folder_path.glob(ext):
            try:
                file_path.unlink()
                print(f'Removed {file_path}')
            except:
                continue


#main execution
def main():
    convert_files_to_jpg(folder_path, file_extension)
    remove_files_with_extension(folder_path, file_extension)