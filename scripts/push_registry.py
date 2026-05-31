import os
import subprocess

registry_dir = r"c:\Users\amaju\Downloads\agentpm\registry"
github_repo = "https://github.com/amajumdar2249/agentpm-registry.git"

def run_git_cmd(args, cwd):
    try:
        res = subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {' '.join(args)}")
        print(f"Error stdout: {e.stdout}")
        print(f"Error stderr: {e.stderr}")
        raise e

def push_to_github():
    print(f"Deploying registry to: {github_repo}")
    
    # 1. Initialize git if not exists
    git_dir = os.path.join(registry_dir, ".git")
    if not os.path.exists(git_dir):
        print("Initializing new Git repository in registry...")
        run_git_cmd(["git", "init"], registry_dir)
        run_git_cmd(["git", "branch", "-M", "main"], registry_dir)
        # Create a basic .gitignore for registry
        gitignore_path = os.path.join(registry_dir, ".gitignore")
        with open(gitignore_path, "w") as f:
            f.write("*.log\n.DS_Store\n")
    
    # 2. Add remote origin if not exists
    try:
        remotes = run_git_cmd(["git", "remote", "-v"], registry_dir)
        if "origin" not in remotes:
            run_git_cmd(["git", "remote", "add", "origin", github_repo], registry_dir)
    except Exception:
        run_git_cmd(["git", "remote", "add", "origin", github_repo], registry_dir)

    # 3. Add files and commit
    print("Staging registry index and package definitions...")
    run_git_cmd(["git", "add", "index.json", "packages/"], registry_dir)
    
    try:
        run_git_cmd(["git", "commit", "-m", "Compile and update registry index with 19.8k skills"], registry_dir)
        print("Committed successfully.")
    except subprocess.CalledProcessError as e:
        if "nothing to commit" in e.stdout or "nothing to commit" in e.stderr:
            print("No changes to commit. Everything is up to date.")
        else:
            raise e

    # 4. Push to main branch
    print("Pushing registry database to GitHub raw server...")
    try:
        # We try pushing. The user might need to authenticate if credential helper is not configured.
        run_git_cmd(["git", "push", "-u", "origin", "main", "--force"], registry_dir)
        print("🌌 Registry database deployed successfully to GitHub raw server!")
    except Exception as err:
        print("\n⚠️ Push failed. This is usually due to GitHub authentication requirements.")
        print("Please verify you have created the repository 'amajumdar2249/agentpm-registry' on GitHub.")
        print("Alternatively, you can run the following command manually inside 'C:\\Users\\amaju\\Downloads\\agentpm\\registry':")
        print("  git push -u origin main --force")

if __name__ == "__main__":
    push_to_github()
