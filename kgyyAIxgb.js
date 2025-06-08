const $ = new Env("酷我音乐多账号");

// 全局通知消息
$.globalNotifyMsg = [];
$.startTime = new Date().getTime(); // 记录脚本开始时间

// 简单字符串哈希函数，用于生成固定设备ID
function simpleStringHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36).substring(0, 12);
}

// 解析多账号配置
function parseAccounts(accountsData, fixedDeviceId) {
  if (!accountsData) return [];
  
  const accounts = [];
  const accountLines = accountsData.split(/[\n;]/).filter(line => line.trim());
  
  for (const line of accountLines) {
    const [user, pwd] = line.split("|").map(item => item.trim());
    if (user && pwd) {
      // 为每个账号生成固定设备ID
      const deviceId = fixedDeviceId || "kuwo_" + simpleStringHash(user);
      accounts.push({ user, pwd, deviceId });
    }
  }
  
  return accounts;
}

// 多账号配置 - 修复变量顺序问题
const PUSHPLUS_TOKEN = $.getdata("KW_PUSHPLUS") || "";
const FIXED_DEVICE_ID = $.getdata("KW_DEVICE_ID") || ""; // 固定设备ID
const ACCOUNTS = parseAccounts($.getdata("KW_ACCOUNTS") || "", FIXED_DEVICE_ID);

// 随机延迟函数
async function randomDelay(min = 1000, max = 5000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await $.wait(delay);
}

(async () => {
  if (ACCOUNTS.length === 0) {
    $.log("⚠️ 未配置账号信息，请设置环境变量KW_ACCOUNTS");
    $.msg($.name, "⚠️ 未配置账号信息", "格式: 手机号1|密码1\n手机号2|密码2");
    $.done();
    return;
  }
  
  $.log(`🔑 共检测到 ${ACCOUNTS.length} 个账号`);
  
  // 按顺序执行每个账号
  for (let i = 0; i < ACCOUNTS.length; i++) {
    const account = ACCOUNTS[i];
    $.log(`\n📱 开始执行第 ${i + 1}/${ACCOUNTS.length} 个账号: ${account.user}`);
    
    const result = await runAccount(account);
    $.globalNotifyMsg.push(`\n📱 账号 ${account.user} 执行结果:`);
    $.globalNotifyMsg.push(...result.notifyMsg);
    
    // 账号间延迟（1-5分钟）
    if (i < ACCOUNTS.length - 1) {
      const delay = Math.floor(Math.random() * 240000) + 60000;
      $.log(`⏳ 账号间延迟 ${Math.round(delay/1000)} 秒...`);
      await $.wait(delay);
    }
  }
  
  // 所有账号执行完成后发送通知
  const endTime = new Date().getTime();
  const duration = (endTime - $.startTime) / 1000; // 计算执行时间
  $.globalNotifyMsg.push(`\n⏱ 总执行时间: ${duration.toFixed(1)}秒`);
  
  const notifyContent = $.globalNotifyMsg.join("\n");
  $.msg($.name, "多账号任务完成", notifyContent);
  
  // 发送PushPlus推送
  if (PUSHPLUS_TOKEN) {
    await pushplusSend($.name, "多账号任务完成", notifyContent);
  }
  
  $.done();
})()
  .catch((e) => $.logErr(e));

// 运行单个账号
async function runAccount(account) {
  const { user, pwd, deviceId } = account;
  const USER_AGENT = `Mozilla/5.0 (Linux; Android 10; MI 9 Build/QKQ1.190716.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.186 Mobile Safari/537.36/ kuwopage/${deviceId}`;
  
  const kw_headers = {
    Host: "integralapi.kuwo.cn",
    Origin: "https://h5app.kuwo.cn",
    Connection: "keep-alive",
    Accept: "application/json, text/plain, */*",
    "User-Agent": USER_AGENT,
    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
    Referer: "https://h5app.kuwo.cn/",
    "Accept-Encoding": "gzip, deflate, br",
  };
  
  let loginUid = "";
  let loginSid = "";
  const notifyMsg = [];
  const completedTasks = new Set();
  
  // 登录获取凭证
  notifyMsg.push("🔑 开始登录酷我音乐账号...");
  const loginResult = await kw_login(user, pwd, USER_AGENT);
  
  if (!loginResult || !loginResult.success) {
    notifyMsg.push("❌ 登录失败，请检查账号密码是否正确");
    return { notifyMsg };
  }
  
  loginUid = loginResult.loginUid;
  loginSid = loginResult.loginSid;
  notifyMsg.push(`✅ 登录成功! loginUid: ${loginUid}, loginSid: ${loginSid}`);
  
  // 添加随机启动延迟（1-30秒）
  await randomDelay(1000, 30000);
  
  await novel();
  await mobile(); // 真实听歌时间模拟（已修改为10-30分钟随机）
  await collect();
  await box(); // 优化后的定时宝箱功能
  
  // 抽奖任务
  await loterry_free();
  await loterry_free();
  
  // 签到任务
  await new_sign();
  
  // 额外签到（最多3次）
  for (let i = 0; i < 3; i++) {
    const result = await sign();
    if (result && result.done) break; // 如果任务完成则跳出循环
    await randomDelay(); // 任务间随机延迟
  }
  
  // 创意视频任务（最多20次）
  for (let i = 0; i < 20; i++) {
    const result = await video();
    if (result && result.done) break; // 如果任务完成则跳出循环
    await randomDelay(); // 任务间随机延迟
  }
  
  // 惊喜任务和视频抽奖
  for (let i = 0; i < 10; i++) {
    const surpriseResult = await surprise();
    if (surpriseResult && surpriseResult.done) break; // 如果任务完成则跳出循环
    
    const loterryResult = await loterry_video();
    if (loterryResult && loterryResult.done) break; // 如果任务完成则跳出循环
    
    await randomDelay(5000, 15000); // 任务间较长随机延迟
  }
  
  // 获取资产
  await getAsset();
  
  return { notifyMsg };
  
  // =================== 登录函数 ===================
  async function kw_login(user, pwd, userAgent) {
    const timestamp = Date.now();
    
    // 第一步：获取登录页面必要参数
    const preLoginUrl = "https://id.kuwo.cn/login/index";
    
    const preLoginHeaders = {
      'Host': 'id.kuwo.cn',
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    let kw_token = "";
    let sessionId = "";
    
    try {
      // 获取预登录参数
      const preLoginResp = await $.http.get({
        url: preLoginUrl,
        headers: preLoginHeaders
      });
      
      // 解析Cookie获取关键参数
      const cookies = preLoginResp.headers['Set-Cookie'] || preLoginResp.headers['set-cookie'];
      if (cookies) {
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        for (let cookieStr of cookieArray) {
          const parts = cookieStr.split(';');
          for (let part of parts) {
            const [key, value] = part.split('=').map(item => item.trim());
            if (key === 'kw_token') {
              kw_token = value;
            } else if (key === 'PHPSESSID') {
              sessionId = value;
            }
          }
        }
      }
      
      // 从HTML中提取form_build_id
      let formBuildId = "";
      const html = preLoginResp.body;
      const formBuildIdMatch = html.match(/name="form_build_id" value="([^"]+)"/);
      if (formBuildIdMatch && formBuildIdMatch[1]) {
        formBuildId = formBuildIdMatch[1];
      }
      
      if (!kw_token || !sessionId || !formBuildId) {
        notifyMsg.push('❌ 预登录失败: 缺少必要参数');
        return { success: false, message: '预登录失败' };
      }
      
      // 添加随机延迟防止检测
      await randomDelay(2000, 5000);
      
      // 第二步：执行登录请求
      const loginUrl = "https://id.kuwo.cn/login/pass";
      
      const loginHeaders = {
        'Host': 'id.kuwo.cn',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': 'https://id.kuwo.cn/login/index?back_url=http%3A%2F%2Fwww.kuwo.cn%2F&from=kwplayer',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'Origin': 'https://id.kuwo.cn',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cookie': `kw_token=${kw_token}; PHPSESSID=${sessionId}`
      };

      const loginBody = `form_id=user_login_form&name=${encodeURIComponent(user)}&pass=${encodeURIComponent(pwd)}&form_build_id=${formBuildId}&op=%E7%99%BB%E5%BD%95`;
      
      const loginResp = await $.http.post({
        url: loginUrl,
        headers: loginHeaders,
        body: loginBody
      });
      
      // 检查登录结果 - 成功登录会重定向
      if (loginResp.status !== 302) {
        // 尝试解析错误信息
        let errorMsg = "登录失败";
        const errorMatch = loginResp.body.match(/<div class="error">([^<]+)<\/div>/);
        if (errorMatch && errorMatch[1]) {
          errorMsg = errorMatch[1].trim();
        }
        notifyMsg.push(`❌ 登录失败: ${errorMsg}`);
        return { success: false, message: errorMsg };
      }
      
      // 从响应头获取登录凭证
      const loginCookies = loginResp.headers['Set-Cookie'] || loginResp.headers['set-cookie'];
      if (!loginCookies) {
        notifyMsg.push('❌ 登录失败: 未获取到凭证Cookie');
        return { success: false, message: '未获取到凭证' };
      }
      
      // 解析登录凭证
      let loginSid = "";
      let loginUid = "";
      
      const loginCookieArray = Array.isArray(loginCookies) ? loginCookies : [loginCookies];
      for (let cookieStr of loginCookieArray) {
        const parts = cookieStr.split(';');
        for (let part of parts) {
          const [key, value] = part.split('=').map(item => item.trim());
          if (key === 'loginSid') {
            loginSid = value;
          } else if (key === 'loginUid') {
            loginUid = value;
          }
        }
      }
      
      if (loginSid && loginUid) {
        notifyMsg.push(`✅ 登录成功! loginUid: ${loginUid}, loginSid: ${loginSid}`);
        return { success: true, loginUid, loginSid };
      } else {
        notifyMsg.push('❌ 登录失败: 未获取到loginSid和loginUid');
        return { success: false, message: '凭证解析失败' };
      }
    } catch (e) {
      notifyMsg.push(`❌ 登录请求失败: ${e.message}`);
      return { success: false, message: e.message };
    }
  }

  // =================== 小说任务 ===================
  async function novel() {
    const taskKey = "novel";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 每日小说任务已完成，跳过");
      return;
    }
    
    await randomDelay();
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/everydaymusic/doListen?loginUid=${loginUid}&loginSid=${loginSid}&from=novel&goldNum=18`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行每日小说任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `每日小说: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `每日小说: 已完成`;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `每日小说: ${desc}`;
        else desc = `每日小说: ${desc}`;
      } else {
        desc = `每日小说: 错误!`;
      }
      notifyMsg.push(desc);
    });
  }

  // =================== 听歌任务（已修改为10-30分钟随机） ===================
  async function mobile() {
    const taskKey = "mobile";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 每日听歌任务已完成，跳过");
      return;
    }
    
    // 听歌总时长设置为10-30分钟随机值
    const totalDurationMinutes = Math.floor(Math.random() * 21) + 10; // 10-30分钟
    const totalDuration = totalDurationMinutes * 60 * 1000; // 转换为毫秒
    
    let elapsedTime = 0;
    let songCount = 0;
    
    // 模拟真实听歌行为
    while (elapsedTime < totalDuration) {
      // 每首歌时长3-5分钟
      const songDuration = Math.floor(Math.random() * 120000) + 180000; // 3-5分钟
      
      // 随机切歌概率（10%）
      const skipSong = Math.random() < 0.1;
      const actualPlayTime = skipSong ? Math.floor(songDuration * 0.3) : songDuration;
      
      // 分段播放（每30秒为一个段落）
      const segments = Math.ceil(actualPlayTime / 30000);
      for (let i = 0; i < segments; i++) {
        const segmentTime = Math.min(30000, actualPlayTime - i * 30000);
        const remaining = totalDuration - elapsedTime;
        
        // 实际等待（但不阻塞脚本）
        if (segmentTime > 0) {
          await $.wait(Math.min(segmentTime, remaining));
          elapsedTime += segmentTime;
          
          // 添加网络波动模拟（5%概率）
          if (Math.random() < 0.05) {
            const networkDelay = Math.floor(Math.random() * 5000) + 1000;
            await $.wait(networkDelay);
            elapsedTime += networkDelay;
          }
        }
      }
      
      songCount++;
      
      // 歌曲间随机间隔（5-30秒）
      if (elapsedTime < totalDuration) {
        const interval = Math.floor(Math.random() * 25000) + 5000;
        await $.wait(interval);
        elapsedTime += interval;
      }
      
      // 显示实际随机生成的听歌总时长
      notifyMsg.push(`🎵 已听 ${songCount} 首歌 (${Math.round(elapsedTime/60000)}分钟/${totalDurationMinutes}分钟)`);
    }
    
    // 完成听歌后执行任务
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/everydaymusic/doListen?loginUid=${loginUid}&loginSid=${loginSid}&from=mobile&goldNum=18`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行每日听歌任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        // 任务完成提示中显示实际随机生成的听歌总时长
        if (desc == "成功") desc = `每日听歌: 完成${songCount}首歌 (总时长: ${totalDurationMinutes}分钟)`;
        else if (desc == "今天已完成任务") {
          desc = `每日听歌: 已完成`;
          completedTasks.add(taskKey);
        }
        else desc = `每日听歌: ${desc}`;
      } else {
        desc = `每日听歌: 错误!`;
      }
      notifyMsg.push(desc);
    });
  }

  // =================== 收藏任务 ===================
  async function collect() {
    const taskKey = "collect";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 每日收藏任务已完成，跳过");
      return;
    }
    
    await randomDelay();
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/everydaymusic/doListen?loginUid=${loginUid}&loginSid=${loginSid}&from=collect&goldNum=18`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行每日收藏任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `每日收藏: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `每日收藏: 已完成`;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `每日收藏: ${desc}`;
        else desc = `每日收藏: ${desc}`;
      } else {
        desc = `每日收藏: 错误!`;
      }
      notifyMsg.push(desc);
    });
  }

  // =================== 视频任务 ===================
  async function video() {
    const taskKey = "video";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 创意视频任务已完成，跳过");
      return { done: true };
    }
    
    await randomDelay(8000, 12000);
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/everydaymusic/doListen?loginUid=${loginUid}&loginSid=${loginSid}&from=videoadver&goldNum=58`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行创意视频任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `创意视频: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `创意视频: 已完成`;
          done = true;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `创意视频: ${desc}`;
        else desc = `创意视频: ${desc}`;
      } else {
        desc = `创意视频: 错误!`;
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // =================== 签到任务 ===================
  async function sign() {
    const taskKey = "sign";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 每日签到任务已完成，跳过");
      return { done: true };
    }
    
    await randomDelay();
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/everydaymusic/doListen?loginUid=${loginUid}&loginSid=${loginSid}&from=sign&extraGoldNum=110`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行每日签到任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `每日签到: ${desc}`;
        else if (desc == "今天已完成任务" || desc == "已达到当日观看额外视频次数") {
          desc = `每日签到: 已完成`;
          done = true;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `每日签到: ${desc}`;
        else desc = `每日签到: ${desc}`;
      } else {
        desc = `每日签到: 错误!`;
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // =================== 新签到任务 ===================
  async function new_sign() {
    const taskKey = "new_sign";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 每日签到任务已完成，跳过");
      return;
    }
    
    await randomDelay();
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/newUserSignList?loginUid=${loginUid}&loginSid=${loginSid}`,
      headers: kw_headers,
    };
    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行每日签到任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.isSign;
        if (desc == true) {
          desc = `每日签到: 成功!`;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `每日签到: 失败`;
      } else {
        desc = `每日签到: 错误!`;
      }
      notifyMsg.push(desc);
    });
  }

  // =================== 免费抽奖任务 ===================
  async function loterry_free() {
    const taskKey = "loterry_free";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 免费抽奖任务已完成，跳过");
      return;
    }
    
    await randomDelay(2000, 10000);
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/loterry/getLucky?loginUid=${loginUid}&loginSid=${loginSid}&type=free`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行免费抽奖任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.loterryname ? `免费抽奖: ${obj.data.loterryname}` : `免费抽奖: 错误!`;
        // 如果抽奖成功，标记为已完成
        if (obj.data.loterryname) completedTasks.add(taskKey);
      } else {
        desc = obj.msg ? `免费抽奖: ${obj.msg}` : `免费抽奖: 错误!`;
        if (desc.includes("免费次数用完了")) {
          completedTasks.add(taskKey);
        }
      }
      notifyMsg.push(desc);
    });
  }

  // =================== 视频抽奖任务 ===================
  async function loterry_video() {
    const taskKey = "loterry_video";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 视频抽奖任务已完成，跳过");
      return { done: true };
    }
    
    await randomDelay(8000, 12000);
    
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/loterry/getLucky?loginUid=${loginUid}&loginSid=${loginSid}&type=video`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行视频抽奖任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.loterryname ? `视频抽奖: ${obj.data.loterryname}` : `视频抽奖: 错误!`;
        if (obj.data.loterryname) {
          // 抽奖成功，但视频抽奖可能有多次机会，不标记为已完成
        }
      } else {
        desc = obj.msg ? `视频抽奖: ${obj.msg}` : `视频抽奖: 错误!`;
        if (desc.includes("视频次数用完了")) {
          done = true;
          completedTasks.add(taskKey);
        }
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // =================== 惊喜任务 ===================
  async function surprise() {
    const taskKey = "surprise";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 惊喜任务已完成，跳过");
      return { done: true };
    }
    
    // 惊喜任务有中等长度延迟
    await randomDelay(10000, 30000);
    
    var rand = Math.random() < 0.3 ? 68 : Math.random() < 0.6 ? 69 : 70;

    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/newDoListen?loginUid=${loginUid}&loginSid=${loginSid}&from=surprise&goldNum=${rand}&surpriseType=`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行惊喜任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `惊喜任务: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `惊喜任务: 已完成`;
          done = true;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `惊喜任务: ${desc}`;
        else desc = `惊喜任务: ${desc}`;
      } else {
        desc = `惊喜任务: 错误!`;
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // 宝箱时间段定义
  const BOX_SCHEDULE = [
    { start: 0, end: 8, time: "00-08" },
    { start: 8, end: 10, time: "08-10" },
    { start: 10, end: 12, time: "10-12" },
    { start: 12, end: 14, time: "12-14" },
    { start: 14, end: 16, time: "14-16" },
    { start: 16, end: 18, time: "16-18" },
    { start: 18, end: 20, time: "18-20" },
    { start: 20, end: 24, time: "20-24" }
  ];

  // =================== 宝箱任务 ===================
  async function box() {
    const taskKey = "box";
    if (completedTasks.has(taskKey)) {
      notifyMsg.push("⏩ 宝箱任务已完成，跳过");
      return;
    }
    
    await randomDelay();
    
    notifyMsg.push("🕒 正在检查宝箱时间段...");
    
    // 获取当前时间（北京时间）
    const now = new Date();
    const beijingHour = now.getUTCHours() + 8;
    const currentHour = beijingHour >= 24 ? beijingHour - 24 : beijingHour;
    
    notifyMsg.push(`🕒 当前北京时间: ${currentHour}时`);
    
    // 找出当前时间段和未领取的时间段
    const availableTimes = [];
    let currentTimeSlot = null;
    let allCompleted = true;
    
    for (const slot of BOX_SCHEDULE) {
      if (currentHour >= slot.start && currentHour < slot.end) {
        currentTimeSlot = slot.time;
        availableTimes.push(slot.time);
        notifyMsg.push(`🟢 当前时间段: ${slot.time}`);
      } else if (currentHour >= slot.end) {
        availableTimes.push(slot.time);
        notifyMsg.push(`🟡 可补领时间段: ${slot.time}`);
      }
    }
    
    // 如果当前时间段存在，优先领取当前时间段宝箱
    if (currentTimeSlot) {
      const result = await box_new(currentTimeSlot);
      if (result && result.done) {
        completedTasks.add(taskKey);
        return; // 如果当前宝箱已完成，不再补领其他
      }
    } else {
      notifyMsg.push("🔴 当前不在任何宝箱时间段内");
    }
    
    // 补领之前未领取的时间段
    for (const time of availableTimes) {
      if (time !== currentTimeSlot) {
        const result = await box_old(time);
        if (!result || !result.done) {
          allCompleted = false;
        }
      }
    }
    
    // 如果所有宝箱都已完成，标记任务完成
    if (allCompleted) {
      completedTasks.add(taskKey);
    }
  }

  // =================== 新宝箱任务 ===================
  async function box_new(time) {
    const taskKey = `box_new_${time}`;
    if (completedTasks.has(taskKey)) {
      notifyMsg.push(`⏩ ${time}时间段宝箱已完成，跳过`);
      return { done: true };
    }
    
    await randomDelay();
    
    var rand = Math.random() < 0.3 ? 28 : Math.random() < 0.6 ? 29 : 30;

    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/new/boxRenew?loginUid=${loginUid}&loginSid=${loginSid}&action=new&time=${time}&goldNum=${rand}`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行定时宝箱任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `定时宝箱[${time}]: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `定时宝箱[${time}]: 已完成`;
          done = true;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `定时宝箱[${time}]: ${desc}`;
        else desc = `定时宝箱[${time}]: ${desc}`;
      } else {
        desc = `定时宝箱[${time}]: 错误!`;
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // =================== 旧宝箱任务 ===================
  async function box_old(time) {
    const taskKey = `box_old_${time}`;
    if (completedTasks.has(taskKey)) {
      notifyMsg.push(`⏩ ${time}时间段补领宝箱已完成，跳过`);
      return { done: true };
    }
    
    await randomDelay();
    
    var rand = Math.random() < 0.3 ? 28 : Math.random() < 0.6 ? 29 : 30;

    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/new/boxRenew?loginUid=${loginUid}&loginSid=${loginSid}&action=old&time=${time}&goldNum=${rand}`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在执行补领宝箱任务...");
      var desc;
      var obj = JSON.parse(resp.body);
      let done = false;
      
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        desc = obj.data.description;
        if (desc == "成功") desc = `补领宝箱[${time}]: ${desc}`;
        else if (desc == "今天已完成任务") {
          desc = `补领宝箱[${time}]: 已完成`;
          done = true;
          completedTasks.add(taskKey);
        }
        else if (desc == "用户未登录") desc = `补领宝箱[${time}]: ${desc}`;
        else desc = `补领宝箱[${time}]: ${desc}`;
      } else {
        desc = `补领宝箱[${time}]: 错误!`;
      }
      notifyMsg.push(desc);
      return { done };
    });
  }

  // =================== 获取资产 ===================
  async function getAsset() {
    let options = {
      url: `https://integralapi.kuwo.cn/api/v1/online/sign/v1/earningSignIn/earningUserSignList?loginUid=${loginUid}&loginSid=${loginSid}`,
      headers: kw_headers,
    };

    return $.http.get(options).then((resp) => {
      notifyMsg.push("🟡正在查询资产...");
      var score;
      var obj = JSON.parse(resp.body);
      if (obj.code == 200 && obj.msg == "success" && obj.success == true) {
        score = obj.data.remainScore ? obj.data.remainScore : 0;
        if (score != 0) {
          var money = (score / 10000).toFixed(2);
          desc = `${score} --> ${money} CNY`;
        } else desc = `资产查询失败!`;
      } else {
        desc = `资产查询: 错误!`;
      }
      notifyMsg.push(desc);
    });
  }
}

// =================== PushPlus推送函数 ===================
async function pushplusSend(title, content, detail) {
  const now = new Date();
  const timeString = now.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const pushData = {
    token: PUSHPLUS_TOKEN,
    title: `${title} - ${timeString}`,
    content: `## ${title}\n**${content}**\n\n### 任务详情\n${detail.replace(/\n/g, "<br>")}`,
    template: "markdown"
  };
  
  $.log(`📤 正在发送PushPlus推送...`);
  
  try {
    const resp = await $.http.post({
      url: "http://www.pushplus.plus/send",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pushData)
    });
    
    const result = JSON.parse(resp.body);
    if (result.code === 200) {
      $.log("✅ PushPlus推送发送成功");
      return true;
    } else {
      $.log(`❌ PushPlus推送失败: ${result.msg || "未知错误"}`);
      return false;
    }
  } catch (e) {
    $.log(`❌ PushPlus推送请求失败: ${e.message}`);
    return false;
  }
}

// =================== 环境类（完整修复版） ===================
function Env(t, s) {
  class e {
    constructor(t) {
      this.env = t;
    }
    send(t, s = "GET") {
      t = "string" == typeof t ? { url: t } : t;
      let e = this.get;
      return (
        "POST" === s && (e = this.post),
        new Promise((s, i) => {
          e.call(this, t, (t, e, r) => {
            t ? i(t) : s(e);
          });
        })
      );
    }
    get(t) {
      return this.send.call(this.env, t);
    }
    post(t) {
      return this.send.call(this.env, t, "POST");
    }
  }
  return new (class {
    constructor(t, s) {
      this.name = t;
      this.http = new e(this); // 确保http对象被创建
      this.data = null;
      this.dataFile = "box.dat";
      this.logs = [];
      this.isMute = !1;
      this.isNeedRewrite = !1;
      this.logSeparator = "\n";
      this.encoding = "utf-8";
      this.startTime = new Date().getTime();
      if (s) Object.assign(this, s);
      this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`);
    }
    isNode() {
      return "undefined" != typeof module && !!module.exports;
    }
    isQuanX() {
      return "undefined" != typeof $task;
    }
    isSurge() {
      return "undefined" != typeof $environment && $environment["surge-version"];
    }
    isLoon() {
      return "undefined" != typeof $loon;
    }
    isShadowrocket() {
      return "undefined" != typeof $rocket;
    }
    isStash() {
      return "undefined" != typeof $environment && $environment["stash-version"];
    }
    toObj(t, s = null) {
      try {
        return JSON.parse(t);
      } catch {
        return s;
      }
    }
    toStr(t, s = null) {
      try {
        return JSON.stringify(t);
      } catch {
        return s;
      }
    }
    getjson(t, s) {
      let e = s;
      const i = this.getdata(t);
      if (i)
        try {
          e = JSON.parse(this.getdata(t));
        } catch {}
      return e;
    }
    setjson(t, s) {
      try {
        return this.setdata(JSON.stringify(t), s);
      } catch {
        return !1;
      }
    }
    getScript(t) {
      return new Promise((s) => {
        this.get({ url: t }, (t, e, i) => s(i));
      });
    }
    runScript(t, s) {
      return new Promise((e) => {
        let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
        i = i ? i.replace(/\n/g, "").trim() : i;
        let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
        (r = r ? 1 * r : 20), (r = s && s.timeout ? s.timeout : r);
        const [o, h] = i.split("@"),
          a = {
            url: `http://${h}/v1/scripting/evaluate`,
            body: { script_text: t, mock_type: "cron", timeout: r },
            headers: { "X-Key": o, Accept: "*/*" },
            timeout: r,
          };
        this.post(a, (t, s, i) => e(i));
      }).catch((t) => this.logErr(t));
    }
    loaddata() {
      if (!this.isNode()) return {};
      {
        (this.fs = this.fs ? this.fs : require("fs")),
          (this.path = this.path ? this.path : require("path"));
        const t = this.path.resolve(this.dataFile),
          s = this.path.resolve(process.cwd(), this.dataFile),
          e = this.fs.existsSync(t),
          i = !e && this.fs.existsSync(s);
        if (!e && !i) return {};
        {
          const i = e ? t : s;
          try {
            return JSON.parse(this.fs.readFileSync(i));
          } catch (t) {
            return {};
          }
        }
      }
    }
    writedata() {
      if (this.isNode()) {
        (this.fs = this.fs ? this.fs : require("fs")),
          (this.path = this.path ? this.path : require("path"));
        const t = this.path.resolve(this.dataFile),
          s = this.path.resolve(process.cwd(), this.dataFile),
          e = this.fs.existsSync(t),
          i = !e && this.fs.existsSync(s),
          r = JSON.stringify(this.data);
        e
          ? this.fs.writeFileSync(t, r)
          : i
          ? this.fs.writeFileSync(s, r)
          : this.fs.writeFileSync(t, r);
      }
    }
    lodash_get(t, s, e) {
      const i = s.replace(/\[(\d+)\]/g, ".$1").split(".");
      let r = t;
      for (const t of i) if (((r = Object(r)[t]), void 0 === r)) return e;
      return r;
    }
    lodash_set(t, s, e) {
      return Object(t) !== t
        ? t
        : (Array.isArray(s) || (s = s.toString().match(/ [^.[\]]+/g) || []),
          (s
            .slice(0, -1)
            .reduce(
              (t, e, i) =>
                Object(t[e]) === t[e]
                  ? t[e]
                  : (t[e] = Math.abs(s[i + 1]) >> 0 == +s[i + 1] ? [] : {}),
              t
            )[s[s.length - 1]] = e),
          t);
    }
    getdata(t) {
      let s = this.getval(t);
      if (/^@/.test(t)) {
        const [, e, i] = /^@(.*?)\.(.*?)$/.exec(t),
          r = e ? this.getval(e) : "";
        if (r)
          try {
            const t = JSON.parse(r);
            s = t ? this.lodash_get(t, i, "") : s;
          } catch (t) {
            s = "";
          }
      }
      return s;
    }
    setdata(t, s) {
      let e = !1;
      if (/^@/.test(s)) {
        const [, i, r] = /^@(.*?)\.(.*?)$/.exec(s),
          o = this.getval(i),
          h = i ? ("null" === o ? null : o || "{}") : "{}";
        try {
          const s = JSON.parse(h);
          this.lodash_set(s, r, t), (e = this.setval(JSON.stringify(s), i));
        } catch (s) {
          const o = {};
          this.lodash_set(o, r, t), (e = this.setval(JSON.stringify(o), i));
        }
      } else e = this.setval(t, s);
      return e;
    }
    getval(t) {
      return this.isSurge() || this.isShadowrocket() || this.isLoon() || this.isStash()
        ? $persistentStore.read(t)
        : this.isQuanX()
        ? $prefs.valueForKey(t)
        : this.isNode()
        ? ((this.data = this.loaddata()), this.data[t])
        : (this.data && this.data[t]) || null;
    }
    setval(t, s) {
      return this.isSurge() || this.isShadowrocket() || this.isLoon() || this.isStash()
        ? $persistentStore.write(t, s)
        : this.isQuanX()
        ? $prefs.setValueForKey(t, s)
        : this.isNode()
        ? ((this.data = this.loaddata()), (this.data[s] = t), this.writedata(), !0)
        : (this.data && this.data[s]) || null;
    }
    initGotEnv(t) {
      (this.got = this.got ? this.got : require("got")),
        (this.cktough = this.cktough ? this.cktough : require("tough-cookie")),
        (this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()),
        t &&
          ((t.headers = t.headers ? t.headers : {}),
          void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar));
    }
    get(t, s = () => {}) {
      if (
        (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]),
        this.isSurge() || this.isShadowrocket() || this.isQuanX() || this.isLoon() || this.isStash()
      )
        this.isSurge() &&
          this.isNeedRewrite &&
          ((t.headers = t.headers || {}),
          Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })),
          $httpClient.get(t, (t, e, i) => {
            !t &&
              e &&
              ((e.body = i),
              (e.statusCode = e.status ? e.status : e.statusCode),
              (e.status = e.statusCode)),
              s(t, e, i);
          });
      else if (this.isQuanX())
        this.isNeedRewrite && ((t.opts = t.opts || {}), Object.assign(t.opts, { hints: !1 })),
          $task.fetch(t).then(
            (t) => {
              const { statusCode: e, statusCode: i, headers: r, body: o } = t;
              s(null, { status: e, statusCode: i, headers: r, body: o }, o);
            },
            (t) => s((t && t.error) || "UndefinedError")
          );
      else if (this.isNode()) {
        let e = require("iconv-lite");
        this.initGotEnv(t),
          this.got(t)
            .on("redirect", (t, s) => {
              try {
                if (t.headers["set-cookie"]) {
                  const e = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                  e && this.ckjar.setCookieSync(e, null), (s.cookieJar = this.ckjar);
                }
              } catch (t) {
                this.logErr(t);
              }
            })
            .then(
              (t) => {
                const { statusCode: i, statusCode: r, headers: o, rawBody: h } = t,
                  a = e.decode(h, this.encoding);
                s(null, { status: i, statusCode: r, headers: o, rawBody: h, body: a }, a);
              },
              (t) => {
                const { message: i, response: r } = t;
                s(i, r, r && e.decode(r.rawBody, this.encoding));
              }
            );
      }
    }
    post(t, s = () => {}) {
      const e = t.method ? t.method.toLocaleLowerCase() : "post";
      if (
        (t.body &&
          t.headers &&
          !t.headers["Content-Type"] &&
          (t.headers["Content-Type"] = "application/x-www-form-urlencoded"),
        t.headers && delete t.headers["Content-Length"],
        this.isSurge() || this.isShadowrocket() || this.isQuanX() || this.isLoon() || this.isStash()
      )
        this.isSurge() &&
          this.isNeedRewrite &&
          ((t.headers = t.headers || {}),
          Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })),
          $httpClient[e](t, (t, e, i) => {
            !t &&
              e &&
              ((e.body = i),
              (e.statusCode = e.status ? e.status : e.statusCode),
              (e.status = e.statusCode)),
              s(t, e, i);
          });
      else if (this.isQuanX())
        (t.method = e),
          this.isNeedRewrite && ((t.opts = t.opts || {}), Object.assign(t.opts, { hints: !1 })),
          $task.fetch(t).then(
            (t) => {
              const { statusCode: e, statusCode: i, headers: r, body: o } = t;
              s(null, { status: e, statusCode: i, headers: r, body: o }, o);
            },
            (t) => s((t && t.error) || "UndefinedError")
          );
      else if (this.isNode()) {
        let i = require("iconv-lite");
        this.initGotEnv(t);
        const { url: r, ...o } = t;
        this.got[e](r, o).then(
          (t) => {
            const { statusCode: e, statusCode: r, headers: o, rawBody: h } = t,
              a = i.decode(h, this.encoding);
            s(null, { status: e, statusCode: r, headers: o, rawBody: h, body: a }, a);
          },
          (t) => {
            const { message: e, response: r } = t;
            s(e, r, r && i.decode(r.rawBody, this.encoding));
          }
        );
      }
    }
    time(t, s = null) {
      const e = s ? new Date(s) : new Date();
      let i = {
        "M+": e.getMonth() + 1,
        "d+": e.getDate(),
        "H+": e.getHours(),
        "m+": e.getMinutes(),
        "s+": e.getSeconds(),
        "q+": Math.floor((e.getMonth() + 3) / 3),
        S: e.getMilliseconds(),
      };
      /(y+)/.test(t) &&
        (t = t.replace(RegExp.$1, (e.getFullYear() + "").substr(4 - RegExp.$1.length)));
      for (let s in i)
        new RegExp("(" + s + ")").test(t) &&
          (t = t.replace(
            RegExp.$1,
            1 == RegExp.$1.length ? i[s] : ("00" + i[s]).substr(("" + i[s]).length)
          ));
      return t;
    }
    queryStr(t) {
      let s = "";
      for (const e in t) {
        let i = t[e];
        null != i &&
          "" !== i &&
          ("object" == typeof i && (i = JSON.stringify(i)), (s += `${e}=${i}&`));
      }
      return (s = s.substring(0, s.length - 1)), s;
    }
    msg(s = t, e = "", i = "", r) {
      const o = (t) => {
        if (!t) return t;
        if ("string" == typeof t)
          return this.isLoon() || this.isShadowrocket()
            ? t
            : this.isQuanX()
            ? { "open-url": t }
            : this.isSurge() || this.isStash()
            ? { url: t }
            : void 0;
        if ("object" == typeof t) {
          if (this.isLoon()) {
            let s = t.openUrl || t.url || t["open-url"],
              e = t.mediaUrl || t["media-url"];
            return { openUrl: s, mediaUrl: e };
          }
          if (this.isQuanX()) {
            let s = t["open-url"] || t.url || t.openUrl,
              e = t["media-url"] || t.mediaUrl,
              i = t["update-pasteboard"] || t.updatePasteboard;
            return { "open-url": s, "media-url": e, "update-pasteboard": i };
          }
          if (this.isSurge() || this.isShadowrocket() || this.isStash()) {
            let s = t.url || t.openUrl || t["open-url"];
            return { url: s };
          }
        }
      };
      if (
        (this.isMute ||
          (this.isSurge() || this.isShadowrocket() || this.isLoon() || this.isStash()
            ? $notification.post(s, e, i, o(r))
            : this.isQuanX() && $notify(s, e, i, o(r))),
        !this.isMuteLog)
      ) {
        let t = [
          "",
          "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3==============",
        ];
        t.push(s),
          e && t.push(e),
          i && t.push(i),
          console.log(t.join("\n")),
          (this.logs = this.logs.concat(t));
      }
    }
    log(...t) {
      t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator));
    }
    logErr(t, s) {
      const e = !(
        this.isSurge() ||
        this.isShadowrocket() ||
        this.isQuanX() ||
        this.isLoon() ||
        this.isStash()
      );
      e
        ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack)
        : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t);
    }
    wait(t) {
      return new Promise((s) => setTimeout(s, t));
    }
    done(t = {}) {
      const s = new Date().getTime(),
        e = (s - this.startTime) / 1000;
      this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),
        this.log(),
        this.isSurge() || this.isShadowrocket() || this.isQuanX() || this.isLoon() || this.isStash()
          ? $done(t)
          : this.isNode() && process.exit(1);
    }
  })(t, s);
}