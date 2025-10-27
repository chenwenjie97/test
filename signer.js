// ========== 工具函数：生成签名 ==========
async function generateSignature(accessKey, secretKey) {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = now - (now % 60); // 对齐到分钟
  const stringToSign = `${accessKey}:${timestamp}`;

  // 使用 Web Crypto API 计算 HMAC-SHA256
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secretKey);
  const dataBuf = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, dataBuf);
  
  // 转为 Base64
  return btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
}

// ========== 全局存储用户输入的 AK/SK ==========
window.mintlifyAuth = window.mintlifyAuth || {
  accessKey: '',
  secretKey: ''
};

// ========== 挂载 "Try it" 请求钩子 ==========
window.mintlify = window.mintlify || {};
window.mintlify.onTryItRequest = async (request) => {
  const { accessKey, secretKey } = window.mintlifyAuth;

  if (!accessKey || !secretKey) {
    alert('❌ 请先在页面顶部填写 Access Key 和 Secret Key！');
    return null; // 取消请求
  }

  try {
    const signature = await generateSignature(accessKey, secretKey);
    const timestamp = Math.floor(Date.now() / 1000) - (Math.floor(Date.now() / 1000) % 60);

    // 设置请求头（根据你的后端要求调整 header 名称）
    request.headers['X-Access-Key'] = accessKey;
    request.headers['X-Timestamp'] = String(timestamp);
    request.headers['X-Signature'] = signature;

    console.log('✅ 签名已注入请求头:', { accessKey, timestamp, signature });
    return request;
  } catch (err) {
    console.error('签名生成失败:', err);
    alert('⚠️ 签名生成失败，请检查控制台。');
    return null;
  }
};

// ========== 动态插入 AK/SK 输入栏 ==========
function injectAuthInputs() {
  // 防止重复插入
  if (document.getElementById('mintlify-ak-sk-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'mintlify-ak-sk-bar';
  bar.style.cssText = `
    position: sticky;
    top: 0;
    background: #f9fafb;
    padding: 12px 24px;
    border-bottom: 1px solid #e5e7eb;
    z-index: 1000;
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  `;

  const label = document.createElement('span');
  label.textContent = '🔐 API Auth:';
  label.style.fontWeight = '600';

  const akInput = document.createElement('input');
  akInput.type = 'text';
  akInput.placeholder = 'Access Key (AK)';
  akInput.value = window.mintlifyAuth.accessKey;
  akInput.style.padding = '6px 10px';
  akInput.style.width = '200px';
  akInput.addEventListener('input', (e) => {
    window.mintlifyAuth.accessKey = e.target.value;
  });

  const skInput = document.createElement('input');
  skInput.type = 'password';
  skInput.placeholder = 'Secret Key (SK)';
  skInput.value = window.mintlifyAuth.secretKey;
  skInput.style.padding = '6px 10px';
  skInput.style.width = '200px';
  skInput.addEventListener('input', (e) => {
    window.mintlifyAuth.secretKey = e.target.value;
  });

  bar.appendChild(label);
  bar.appendChild(akInput);
  bar.appendChild(skInput);

  // 插入到 main 内容顶部
  const main = document.querySelector('main');
  if (main && main.firstChild) {
    main.insertBefore(bar, main.firstChild);
  }
}

// 等 DOM 加载完成后插入
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAuthInputs);
} else {
  injectAuthInputs();
}