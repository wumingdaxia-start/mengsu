<script setup>
defineProps({card:{type:Object,required:true}})
</script>
<template>
  <article class="personality-card" :class="`palette-${card.palette}`" :aria-label="`${card.title} · ${card.subtitle}`">
    <div class="card-top"><span>心绪行迹</span><span>{{ card.number }}</span></div>
    <svg class="card-art" viewBox="0 0 240 230" role="img" :aria-label="card.artLabel">
      <path class="arch" d="M25 209V108a95 95 0 0 1 190 0v101"/>
      <circle class="sun" cx="165" cy="59" r="24"/>
      <path class="faint" d="M33 198H207M46 207H194"/>
      <g v-if="card.art==='tide'">
        <path class="land" d="M27 173Q66 147 99 169L136 198H27Z"/><path class="water" d="M111 164q24-11 53 0t48 0M118 178q25-10 50 0t43 0M141 191q22-8 40 0t28 0"/>
        <path class="coat" d="M76 115q-18 15-13 46l33 2 9-28-17-21Z"/><circle class="face" cx="83" cy="101" r="12"/><path class="ink" d="M74 94q12-12 21 4M90 135l18 20 21 3M89 164l23 10 16 15M76 165l10 18 20 7"/><path class="faint" d="m41 66 8-5 8 5m10-8 8-5 8 5"/>
      </g>
      <g v-else-if="card.art==='hearth'">
        <ellipse class="land" cx="119" cy="192" rx="79" ry="10"/><path class="coat" d="M54 134q-14 16-13 45h36l-4-43Z M164 135q-11 18-7 44h36q-3-28-16-44Z"/><circle class="face" cx="62" cy="121" r="11"/><circle class="face" cx="175" cy="121" r="11"/>
        <path class="ink" d="m69 147 23 11m-22 21-1 17m103-48-22 10m20 22 4 15M94 169h51m-47 0-6 25m48-25 6 25"/><path class="accent" d="M109 145q-9-12 5-29-1 11 10 14 7-7 5-15 17 22 2 30Z"/><path class="faint" d="M111 99q-8-10 2-18m15 21q8-10 0-19"/>
      </g>
      <g v-else-if="card.art==='garden'">
        <path class="land" d="M29 189q84-31 181 0v13H29Z"/><path class="coat" d="m76 122-13 48h37l-9-48Z"/><circle class="face" cx="83" cy="108" r="11"/><path class="ink" d="M64 103q19-19 39 1H64m15 67-3 22m17-22 7 22m-7-57 20 15 17-9"/>
        <path class="pot" d="m124 144 22-6 6 15-22 6Zm25 1 16-5-8 12"/><path class="faint" d="m161 157 2 8m6-9 2 8m6-10 2 8"/><path class="ink" d="M173 191v-20m-1 9q-18-3-15-13 15 0 15 13m1-4q17-2 17-13-13 0-17 13M43 189v-16"/><path class="leaf" d="M44 178q-15-3-11-14 12 0 11 14m0-4q14-3 13-15-12 2-13 15"/>
      </g>
      <g v-else-if="card.art==='light'">
        <path class="land" d="m29 199 36-38 31 14 45-39 70 63Z"/><path class="coat" d="m105 106-17 56 43 2-11-56Z"/><circle class="face" cx="112" cy="94" r="11"/><path class="ink" d="m100 162-6 27m27-25 6 24m-4-68 22-16 10-23"/><path class="accent" d="m154 77 8-13 8 13-8 13Z"/><path class="ink" d="M151 61q10-8 21 0m-11-7V45m19 21 9-4m-44-7-6-7"/><path class="faint" d="m49 95 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z"/>
      </g>
      <g v-else-if="card.art==='cloud'">
        <path class="land" d="M27 186q-4-22 21-24 0-27 26-23 17-23 36-2 28-8 33 15 30-2 34 24 26-2 33 20H27Z"/><path class="coat" d="m102 98-15 55q24 10 50-1l-18-54Z"/><circle class="face" cx="111" cy="85" r="11"/><path class="ink" d="m96 152 3 22m25-21-2 22m-24-58-18 17m46-17 18 13"/><path class="faint" d="M47 77q-8-10 3-16 0-12 13-10 8-13 19-1 14-1 15 11M143 120q8-12 19-4 9-9 16 2"/>
      </g>
      <g v-else-if="card.art==='path'">
        <path class="land" d="M29 197q8-45 49-49 34-7 58 12 39-10 74 37Z"/><path class="paper" d="M95 199q-9-30 39-36 40-6-5-24l11-11q65 33 20 46-33 10-23 25Z"/><path class="coat" d="m76 98-13 50h35l-11-50Z"/><circle class="face" cx="81" cy="85" r="11"/><path class="ink" d="m73 148-5 27m21-27 11 26m-6-58 19 11m-8-1 13-12m-1-5 18 8-15 17-18-9Z"/><path class="faint" d="m174 146 8-30m-16 1h31l-14-12-15 12"/>
      </g>
      <g v-else-if="card.art==='warmth'">
        <ellipse class="land" cx="121" cy="193" rx="66" ry="10"/><path class="coat" d="M91 113q-13 20-13 55h70q-1-36-18-55Z"/><circle class="face" cx="110" cy="96" r="13"/><path class="ink" d="M99 88q15-12 26 7m-31 43 13 9m26-10-12 10m-28 21 5 27m34-27-3 27"/><path class="pot" d="M106 133h19v16q-10 7-19 0Zm19 3q15-1 3 11"/><path class="faint" d="M109 125q-6-7 0-12m9 12q8-7 0-12"/><path class="leaf" d="M50 185q1-29 13-32 1 27-13 32m0-9q-20-8-17-24 18 8 17 24"/>
      </g>
      <g v-else-if="card.art==='stars'">
        <path class="land" d="M29 195q63-24 103-8 48-24 79 8Z"/><path class="coat" d="m66 126-14 50h36l-10-50Z"/><circle class="face" cx="72" cy="112" r="10"/><path class="ink" d="m60 176-5 19m23-19 7 19m-6-55 24-13m8 7 33 60m-24-65-18 66"/>
        <path class="pot" d="m105 120 51-30 9 16-51 29Z"/><path class="ink" d="m151 89 11-7 13 23-11 6"/><path class="faint" d="m105 52 21 17 29-32 24 17M105 47v10m-5-5h10m40-15h10m-5-5v10m19 12h10m-5-5v10"/>
      </g>
      <g v-else-if="card.art==='shore'">
        <path class="land" d="M28 168q52-22 103 5l-9 27H28Z"/><path class="coat" d="m73 112-13 48 29 9 17-32-21-24Z"/><circle class="face" cx="81" cy="99" r="11"/><path class="ink" d="m88 136 29 14 19-4m-56 19 20 17 14 4M130 145v49m-8-39h16"/><path class="pot" d="M146 175h62l-15 17h-32Z"/><path class="ink" d="M146 177q-9-24-16-27"/><path class="water" d="M139 201q18-6 33 0t34 0m-32-41q17-5 35 0"/>
      </g>
      <g v-else-if="card.art==='sail'">
        <path class="water" d="M28 184q26-11 57 0t59 0 67 0M28 199q26-9 57 0t59 0 67 0"/><path class="pot" d="m67 162 106 1-19 24h-65Z"/><path class="paper" d="M124 57v92h62Z"/><path class="leaf" d="m116 83-40 66h40Z"/><path class="ink" d="M124 54v110"/><circle class="face" cx="103" cy="147" r="8"/><path class="coat" d="m95 155-5 13h26l-7-13Z"/><path class="faint" d="M38 90h36m-26 11h21M166 67l11-7 11 7"/>
      </g>
      <g v-else-if="card.art==='leaf'">
        <path class="land" d="M28 198q54-23 104-5 40-12 80 5Z"/><path class="coat" d="m83 127-13 47h36l-10-47Z"/><circle class="face" cx="89" cy="114" r="11"/><path class="ink" d="m78 174-2 21m20-21 7 21m-4-49 23-6V81m-1 59q10 12 17 0"/>
        <path class="leaf" d="M67 85q49-73 99 0-17-9-34 0-17-9-33 0-16-9-32 0Z"/><path class="ink" d="M117 50q-17 11-18 34m18-34q18 9 16 34"/><path class="pot" d="m155 177 27 1-5 19h-17Z"/><path class="ink" d="M168 178v-27"/><path class="leaf" d="M168 166q-22-4-17-18 17 1 17 18m1-5q19-4 18-19-17 2-18 19"/>
      </g>
      <g v-else-if="card.art==='lamp'">
        <path class="land" d="M28 199q41-21 83-2 50-30 100-2v6H28Z"/><path class="coat" d="m87 119-16 55h43l-13-55Z"/><circle class="face" cx="94" cy="106" r="11"/><path class="ink" d="m82 174-4 22m23-22 8 22m-8-60 30-14 13-24m13-44v140"/><path class="pot" d="m146 64 22 0-3 31h-16Z"/><path class="accent" d="m154 73 7 0-1 12h-5Z"/><path class="ink" d="m143 64 14-12 14 12m-28 132h30"/><path class="faint" d="m176 74 15-5m-15 17 15 5m-63-17 10 2"/>
      </g>
      <g v-else>
        <path class="water" d="M30 175q43-24 88 0t92 0M30 189q43-24 88 0t92 0"/><path class="paper" d="M73 153q46-40 94 0l-8 10q-39-29-77 0Z"/><circle class="face" cx="120" cy="110" r="11"/><path class="coat" d="m112 121-11 31h37l-10-31Z"/><path class="faint" d="M68 80q20-23 40 0m37 3q17-20 34 0"/>
      </g>
    </svg>
    <div class="card-caption"><h3>{{ card.title }}</h3><p>{{ card.subtitle }}</p></div>
    <div class="card-bottom"><span>花屿星 · 星栈</span><span>生活偏好卡</span></div>
  </article>
</template>
<style scoped>
.personality-card{--ink:#526b65;--soft:#d7e2d5;--accent:#c3a477;--paper:#fbf8f0;--ground:#e6e8d9;box-sizing:border-box;position:relative;display:flex;flex-direction:column;width:100%;aspect-ratio:240/354;padding:15px 17px 12px;color:var(--ink);border:1px solid color-mix(in srgb,var(--ink) 38%,transparent);border-radius:13px;background:var(--paper);outline:1px solid color-mix(in srgb,var(--ink) 17%,transparent);outline-offset:-7px;overflow:hidden}.palette-rose{--ink:#805e62;--soft:#e4d3cc;--accent:#c99c88;--paper:#fcf4ee;--ground:#eddfd4}.palette-slate{--ink:#576c7f;--soft:#d4dfe5;--accent:#b4a17b;--paper:#f4f7f6;--ground:#dfe6e5}.palette-ochre{--ink:#79664c;--soft:#e6dcc3;--accent:#bd8c62;--paper:#fbf6e9;--ground:#e9e1cb}.card-top,.card-bottom{display:flex;justify-content:space-between;gap:8px;font-size:9px;line-height:1.5}.card-top{padding:0 2px}.card-top span:last-child{font-family:Georgia,serif;font-size:12px}.card-art{display:block;width:100%;min-height:0;flex:1;overflow:visible}.card-art *{vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.arch{fill:none;stroke:var(--ink);stroke-width:.65;opacity:.25}.sun{fill:var(--soft);opacity:.75}.faint{fill:none;stroke:var(--ink);stroke-width:.9;opacity:.45}.ink{fill:none;stroke:var(--ink);stroke-width:1.35}.land{fill:var(--ground)}.water{fill:none;stroke:var(--ink);stroke-width:1;opacity:.6}.coat,.leaf{fill:var(--soft);stroke:var(--ink);stroke-width:1.1}.face,.paper{fill:var(--paper);stroke:var(--ink);stroke-width:1.1}.pot{fill:var(--ground);stroke:var(--ink);stroke-width:1.1}.accent{fill:var(--accent);stroke:var(--ink);stroke-width:.8}.card-caption{text-align:center;margin:-1px 0 13px}.card-caption h3{font:500 clamp(19px,2.2vw,27px)/1.4 var(--display,"Noto Serif SC",serif);margin:0 0 5px;letter-spacing:.04em}.card-caption p{font-size:10px;line-height:1.6;margin:0}.card-bottom{padding-top:9px;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent);font-size:8px}@media(max-width:520px){.personality-card{padding:12px 12px 10px}.card-top{font-size:8px}.card-top span:last-child{font-size:10px}.card-caption{margin-bottom:9px}.card-caption h3{font-size:20px}.card-caption p{font-size:9px}.card-bottom{font-size:7px;padding-top:6px}}
</style>
