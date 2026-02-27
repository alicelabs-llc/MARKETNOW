$urls=@(
 'http://localhost:8080/actuator/health',
 'http://localhost:8081/actuator/health',
 'http://localhost:8070/actuator/health',
 'http://localhost:3000'
)
$out=@()
foreach($u in $urls){
  try {
    $r=Invoke-WebRequest -Uri $u -Method GET -TimeoutSec 2
    $out += "$u => $($r.StatusCode)"
  } catch {
    $out += "$u => DOWN"
  }
}
$out | Set-Content 'evidence/bugbounty/logs/local_services_status.txt' -Encoding utf8
$out