# 基础镜像
FROM nginx:alpine

# 维护者
LABEL maintainer="smartwardrobe"

# 把 Jenkins 打包生成的 dist 文件夹拷进去
COPY dist/ /usr/share/nginx/html/

# 把 Nginx 配置拷进去
COPY default.conf /etc/nginx/conf.d/default.conf

# 暴露容器内部端口
EXPOSE 80