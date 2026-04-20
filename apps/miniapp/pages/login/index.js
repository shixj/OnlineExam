const api = require("../../utils/api");
const { isLoggedIn, setAuthState } = require("../../utils/auth");

const TAB_PAGES = ["/pages/home/index", "/pages/history/index"];

function jumpAfterLogin(redirect) {
  const target = redirect || "/pages/home/index";
  if (TAB_PAGES.includes(target)) {
    wx.switchTab({ url: target });
    return;
  }

  wx.reLaunch({ url: target });
}

Page({
  data: {
    redirect: "",
    form: {
      username: "",
      password: "",
    },
    submitting: false,
  },
  onLoad(options) {
    this.setData({
      redirect: options && options.redirect ? decodeURIComponent(options.redirect) : "",
    });
  },
  onShow() {
    if (isLoggedIn()) {
      jumpAfterLogin("/pages/home/index");
    }
  },
  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },
  async submitLogin() {
    const { username, password } = this.data.form;
    if (!username || !password) {
      wx.showToast({
        title: "请输入用户名和密码",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      const auth = await api.login({ username, password });
      setAuthState(auth);
      wx.showToast({
        title: "登录成功",
        icon: "success",
      });
      setTimeout(() => {
        jumpAfterLogin(this.data.redirect);
      }, 250);
    } catch (error) {
      wx.showToast({
        title: error.message || "登录失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
