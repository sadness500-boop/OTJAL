// OTJAL PC 프로그램 (Windows) — Designed & Developed by Rat Rae Choi
// Windows 10/11에 기본 설치된 Microsoft Edge WebView2로 OTJAL 웹앱을 독립 창에서 실행합니다.
package main

import (
	"embed"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

//go:embed www
var www embed.FS

const appTitle = "OTJAL · AI 패션 스타일리스트 — Rat Rae Choi"

func msgBox(text, title string) {
	u := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString(title)
	u.Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), 0x40)
}

func openURL(u string) {
	if strings.HasPrefix(u, "https://") || strings.HasPrefix(u, "http://") {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", u).Start()
	}
}

func main() {
	sub, _ := fs.Sub(www, "www")
	// 저장된 내 스타일·찜이 유지되도록 항상 같은 주소(포트)를 쓰고, 사용 중이면 다른 포트로
	ln, err := net.Listen("tcp", "127.0.0.1:47917")
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			msgBox("OTJAL을 시작하지 못했어요: "+err.Error(), "OTJAL")
			return
		}
	}
	go http.Serve(ln, http.FileServer(http.FS(sub)))

	data := filepath.Join(os.Getenv("LOCALAPPDATA"), "OTJAL")
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		AutoFocus: true,
		DataPath:  data,
		WindowOptions: webview2.WindowOptions{
			Title: appTitle, Width: 1400, Height: 920, IconId: 1, Center: true,
		},
	})
	if w == nil {
		msgBox("OTJAL을 실행하려면 Microsoft Edge WebView2 런타임이 필요해요.\n확인을 누르면 설치 페이지가 열립니다. 설치 후 다시 실행해 주세요.", "OTJAL")
		openURL("https://developer.microsoft.com/microsoft-edge/webview2/")
		return
	}
	defer w.Destroy()
	w.SetSize(1100, 720, webview2.HintMin)
	w.Bind("otjalOpen", func(u string) { openURL(u) })
	// 새 창으로 여는 링크(쇼핑몰 검색 결과·상품 페이지)는 기본 브라우저로 열기
	w.Init(`(function(){
	  window.OTJAL_DESKTOP = true;
	  document.addEventListener("click", function(e){
	    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null; if (!a) return;
	    var u = a.href || "";
	    if (/^https?:/i.test(u) && (a.target === "_blank" || u.indexOf(location.origin) !== 0)) { e.preventDefault(); window.otjalOpen(u); }
	  }, true);
	  var _open = window.open; window.open = function(u){ if (u && /^https?:/i.test(u)) { window.otjalOpen(String(u)); return null; } return _open.apply(window, arguments); };
	})();`)
	w.Navigate("http://" + ln.Addr().String() + "/index.html")
	w.Run()
}
