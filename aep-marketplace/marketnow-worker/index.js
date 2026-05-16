export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const target = 'https://marketnow.pages.dev';
    return Response.redirect(target + url.pathname + url.search, 301);
  }
};
