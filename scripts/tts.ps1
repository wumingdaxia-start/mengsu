param([string]$OutFile)

# ASCII-only file. The SSML text arrives base64-encoded via CUE_SSML_B64 so that
# non-ASCII content never has to be embedded in this script.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$ssml = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($env:CUE_SSML_B64))
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    22050,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono)

try { $synth.SelectVoice("Microsoft Huihui Desktop") } catch { }
$synth.Rate = -2
$synth.Volume = 85
$synth.SetOutputToWaveFile($OutFile, $format)
$synth.SpeakSsml($ssml)
$synth.Dispose()
Write-Host "ok"
