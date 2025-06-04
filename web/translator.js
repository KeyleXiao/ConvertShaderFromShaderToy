
let inputEditor;
let outputEditor;

window.addEventListener('load', () => {
  inputEditor = CodeMirror.fromTextArea(document.getElementById('input'), {
    lineNumbers: true,
    mode: 'x-shader/x-fragment',
    theme: 'eclipse'
  });
  outputEditor = CodeMirror.fromTextArea(document.getElementById('output'), {
    lineNumbers: true,
    mode: 'x-shader/x-fragment',
    theme: 'eclipse',
    readOnly: true
  });
});

function convertShader() {
  const code = inputEditor.getValue();
  const target = document.getElementById('target').value;
  const result = shadertoyToUnity(code, target);
  outputEditor.setValue(result);
  outputEditor.refresh();
}

function shadertoyToUnity(code, target) {
  let body = code;
  // basic replacements from GLSL to HLSL
  const replacements = [
    [/vec2/g, 'float2'],
    [/vec3/g, 'float3'],
    [/vec4/g, 'float4'],
    [/iTime/g, '_Time.y'],
    [/iResolution/g, '_Resolution'],
    [/mainImage\s*\(/, 'frag(']
  ];
  replacements.forEach(([from, to]) => {
    body = body.replace(from, to);
  });
  return wrapShader(body, target);
}

function wrapShader(body, target) {
  if (target === 'urp') return wrapUrp(body);
  return wrapLegacy(body);
}

function wrapUrp(body) {
  return `Shader "Custom/GeneratedURP" {
  Properties {
    _MainTex ("Texture", 2D) = "white" {}
  }
  SubShader {
    Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
    Pass {
      HLSLPROGRAM
      #pragma vertex vert
      #pragma fragment frag
      #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
      struct Attributes {
        float4 positionOS : POSITION;
        float2 uv : TEXCOORD0;
      };
      struct Varyings {
        float4 positionCS : SV_POSITION;
        float2 uv : TEXCOORD0;
      };
      TEXTURE2D(_MainTex);
      SAMPLER(sampler_MainTex);
      Varyings vert(Attributes IN) {
        Varyings OUT;
        OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
        OUT.uv = IN.uv;
        return OUT;
      }
      float4 frag(Varyings IN) : SV_Target {
${indent(body, 8)}
      }
      ENDHLSL
    }
  }
}`;
}

function wrapLegacy(body) {
  return `Shader "Custom/GeneratedLegacy" {
  Properties {
    _MainTex ("Texture", 2D) = "white" {}
  }
  SubShader {
    Tags { "RenderType"="Opaque" }
    Pass {
      CGPROGRAM
      #pragma vertex vert
      #pragma fragment frag
      #include "UnityCG.cginc"
      struct appdata {
        float4 vertex : POSITION;
        float2 uv : TEXCOORD0;
      };
      struct v2f {
        float2 uv : TEXCOORD0;
        float4 vertex : SV_POSITION;
      };
      sampler2D _MainTex;
      v2f vert(appdata v) {
        v2f o;
        o.vertex = UnityObjectToClipPos(v.vertex);
        o.uv = v.uv;
        return o;
      }
      fixed4 frag(v2f i) : SV_Target {
${indent(body, 8)}
      }
      ENDCG
    }
  }
}`;
}

function indent(text, spaces) {
  return text.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
}

