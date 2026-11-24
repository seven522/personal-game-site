$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$config = Join-Path $base 'tools/cpolar/game-site.yml'
$binary = Join-Path $base 'tools/cpolar/portable/cpolar/cpolar.exe'
if (-not (Select-String -LiteralPath $config -Pattern '^authtoken:\s*\S+' -Quiet)) {
    Start-Process 'https://dashboard.cpolar.com/auth'
    Write-Host '请登录官网，复制 Authtoken 授权码，在下面粘贴（输入不显示）。密码不要填在这里。'
    $secret = Read-Host 'Authtoken' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try {
        $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
        if ($token -notmatch '^[A-Za-z0-9_-]{10,}$') { throw '授权码格式不符，请重新运行并复制完整 Authtoken。' }
        Add-Content -LiteralPath $config -Value ('authtoken: ' + $token) -Encoding UTF8
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
        & icacls.exe $config /inheritance:r /grant:r "${identity}:(F)" 'SYSTEM:(F)' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw '授权配置权限设置失败。' }
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $token = $null
        $secret.Dispose()
    }
}
try { $null = Invoke-WebRequest 'http://127.0.0.1:8080' -UseBasicParsing } catch {
    Start-Process node -ArgumentList 'server.mjs' -WorkingDirectory $base -WindowStyle Hidden
}
Write-Host '启动游戏网站公网隧道。请保持此窗口开启；按 Ctrl+C 停止隧道。'
& $binary start "-config=$config" game-site
Read-Host '程序已停止，按回车关闭'
