#ifdef GL_ES
  precision mediump float;
#endif

varying vec2 vTexCoord;
uniform sampler2D d_map;
uniform sampler2D u_path_mask;
uniform sampler2D img;
uniform float u_bass;
uniform float u_mid;
uniform float u_noise_scale;
uniform float u_path_progress;
uniform float u_path_window;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_tResolution;
uniform vec2 u_spiral_center;

void main() {

  vec2 ratio = vec2(
    min((u_resolution.x / u_resolution.y) / (u_tResolution.x / u_tResolution.y), 1.0),
    min((u_resolution.y / u_resolution.x) / (u_tResolution.y / u_tResolution.x), 1.0)
  );

  vec2 uv = vec2(
    vTexCoord.x * ratio.x + (1.0 - ratio.x) * 0.5,
    vTexCoord.y * ratio.y + (1.0 - ratio.y) * 0.5
  );

  uv.y = 1.0 - uv.y;

  vec2 noise_uv = fract((uv - 0.5) * u_noise_scale + 0.5);
  vec4 texture = texture2D(d_map, noise_uv);
  vec4 path_mask = texture2D(u_path_mask, uv);
  float influence = smoothstep(0.0, 1.0, path_mask.a);
  vec2 outward_direction = normalize(vec2(uv.x - u_spiral_center.x, uv.y - u_spiral_center.y));

  float map_variation = dot(texture.rgb, vec3(0.333));
  float disp = u_bass * mix(0.55, 1.35, map_variation);

  uv -= outward_direction * disp * influence;

  vec4 image = texture2D(img, uv);

  gl_FragColor = image;
}
