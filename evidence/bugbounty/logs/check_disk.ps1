$d = Get-PSDrive C
$freeGB = [math]::Round($d.Free / 1GB,2)
$usedGB = [math]::Round($d.Used / 1GB,2)
"UsedGB=$usedGB FreeGB=$freeGB" | Set-Content 'evidence/bugbounty/logs/disk_status.txt' -Encoding utf8
Get-Content 'evidence/bugbounty/logs/disk_status.txt'