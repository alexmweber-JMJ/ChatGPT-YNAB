$ErrorActionPreference = 'Stop'

$secureToken = Read-Host 'Paste your YNAB personal access token' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
    $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        throw 'No token was entered.'
    }

    [Environment]::SetEnvironmentVariable('YNAB_ACCESS_TOKEN', $plainToken, 'User')
    Write-Host 'YNAB_ACCESS_TOKEN was saved as a Windows user environment variable.'
    Write-Host 'Fully quit Codex, reopen it, and start a new task.'
}
finally {
    if ($tokenPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    }
    Remove-Variable plainToken -ErrorAction SilentlyContinue
    Remove-Variable secureToken -ErrorAction SilentlyContinue
}
