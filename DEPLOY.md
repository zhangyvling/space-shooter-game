# 🚀 部署指南 - GitHub Pages

## 步骤1：创建GitHub仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 输入仓库名称（如 `space-shooter-game`）
4. 选择公开（Public）
5. **不要**初始化README、.gitignore或许可证（我们已有这些文件）
6. 点击 "Create repository"

## 步骤2：上传文件到GitHub

### 方法A：通过GitHub网页界面（最简单）
1. 在新建的仓库页面，点击 "Add file" → "Upload files"
2. 将 `space-shooter` 文件夹中的所有文件拖放到上传区域
3. 点击 "Commit changes"

### 方法B：通过Git命令行
```bash
# 进入游戏目录
cd space-shooter

# 初始化Git
git init
git add .
git commit -m "Initial commit: Space Shooter game"

# 连接到GitHub仓库
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

## 步骤3：启用GitHub Pages

1. 进入仓库页面
2. 点击 "Settings"（设置）
3. 在左侧菜单找到 "Pages"（页面）
4. 在 "Source" 部分：
   - 选择 "Deploy from a branch"
   - 分支选择 "main"
   - 文件夹选择 "/ (root)"
5. 点击 "Save"

## 步骤4：等待部署完成

- GitHub Pages 通常需要 **1-2分钟** 来部署
- 刷新页面后，你会看到绿色的部署成功消息
- 你的游戏将在以下地址可访问：
  ```
  https://你的用户名.github.io/仓库名/
  ```

## 步骤5：测试游戏

1. 打开部署的URL
2. 测试所有功能：
   - 开始/暂停/重新开始按钮
   - 键盘控制（← → 空格）
   - 移动端按钮控制
   - 音效开关
   - 分数和生命值系统
   - 本地存储（最高分）

## 🔧 故障排除

### 问题：页面显示404错误
- 等待几分钟后重试
- 检查仓库设置中的Pages配置
- 确保所有文件都在根目录

### 问题：游戏无法加载
- 检查浏览器控制台是否有错误（F12 → Console）
- 确保所有文件路径正确
- 尝试清除浏览器缓存

### 问题：移动端控制不工作
- 确保使用支持触摸的设备
- 检查是否有其他JavaScript错误
- 尝试在移动端浏览器中直接访问

## 📱 自定义域名（可选）

如果你想使用自定义域名：

1. 在域名注册商处添加CNAME记录：
   ```
   yourdomain.com CNAME 你的用户名.github.io
   ```
2. 在GitHub Pages设置中添加自定义域名
3. 在仓库根目录创建 `CNAME` 文件，内容为你的域名

## 🔄 更新游戏

当你修改游戏后：

```bash
# 提交更改
git add .
git commit -m "更新描述"
git push origin main
```

GitHub Pages会自动重新部署（通常需要1-2分钟）。

## 🌐 分享游戏

游戏部署后，你可以：
- 分享链接给朋友
- 嵌入到其他网站
- 添加到手机主屏幕（移动端）

## 📊 访问统计（可选）

要跟踪游戏访问量：

1. 注册 [Google Analytics](https://analytics.google.com)
2. 获取跟踪ID（如 `UA-XXXXXXXXX-X`）
3. 在 `index.html` 的 `<head>` 部分添加跟踪代码

---

**恭喜！** 🎉 你的太空射击游戏现在已上线，任何人都可以通过互联网访问！

如果有任何部署问题，请参考 [GitHub Pages文档](https://docs.github.com/pages)。