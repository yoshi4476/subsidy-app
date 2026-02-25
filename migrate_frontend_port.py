import os

def migrate():
    root_dir = r'f:\補助金システム\frontend'
    old_str = 'localhost:8000'
    new_str = 'localhost:8080'
    
    count = 0
    for root, dirs, files in os.walk(root_dir):
        # Exclude node_modules and .next
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.next')]
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if old_str in content:
                        new_content = content.replace(old_str, new_str)
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated: {filepath}")
                        count += 1
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
    
    print(f"Migration completed. {count} files updated.")

if __name__ == "__main__":
    migrate()
