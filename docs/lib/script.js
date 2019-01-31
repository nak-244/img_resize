$(function(){
    $(".dropable_box").on("dragover", function(e){
        e.stopPropagation()
        e.preventDefault()
    })
    //ドロップイベント
    $(".dropable_box").on("drop", function(e){
        e.stopPropagation()//親DOMへのイベントのバブリング禁止
        e.preventDefault()
        let self = this;
        $.each(e.originalEvent.dataTransfer.files, function(idx, file){
            var fr = new FileReader()
            fr.self = self //thisエレメント
            fr.file = file //SVG用に元ファイルも渡す
            fr.onload = checkFileType //イベント定義
            fr.readAsArrayBuffer(file) //読み込み開始
        })
    })

    //ファイルタイプのチェック
    //Refference from https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload
    function checkFileType(e){
        let arr = (new Uint8Array(e.target.result)).subarray(0, 4)
        let header = "",
        type = ""
        for (let i = 0; i < arr.length; i++) {
            header += arr[i].toString(16)
        }
        switch (header) {
        case "89504e47":
            type = "image/png"
            break;
        case "47494638":
            type = "image/gif"
            break;
        case "ffd8ffe0":
        case "ffd8ffe1":
        case "ffd8ffe2":
            type = "image/jpeg"
            break;
        default:
            type = ""
            break;
        }
    		if(type!=="") {
            //正しく読み込めた
            checkFile_callback.call(this.self, type, e.target.result)
            return;
    		}
        //SVG形式で読み込みチェック
        let fr = new FileReader();
        fr.self = this.self; //元エレメント
        fr.bin = e.target.result;
    		fr.onloadend = function(e2) {
            //XMLパーサーを使う
            let PARSER = new DOMParser()
            let doc = null,
            type = "image/svg+xml"
            try {
            	  doc = PARSER.parseFromString(e2.target.result, type)
            } catch(er){
                //失敗(異常系)
                checkFile_callback.call(this.self, "unknown", null)
                return;
            }
            //失敗(正常系)
            if(doc.getElementsByTagName("parsererror").length > 0){
                checkFile_callback.call(this.self, "unknown", null)
                return;
            }
            //正しく読み込めた
            checkFile_callback.call(this.self, type, this.bin)
            return;
    		}
    		fr.readAsText(this.file)
    }

    //ファイルチェック後のコールバック
    function checkFile_callback(type, data){
		    if(type !== "unknown"){
            //バイナリをBLOB-URL化
            let bin = new Uint8Array(data)
            let blob_url = URL.createObjectURL(
                new Blob([bin], { 'type': type })
            )
            //読み込んだファイルを表示
            $(this).css({"background": "url("+blob_url+") center center/contain no-repeat"})

            //ファイルサイズの変更
            let image = new Image() //イメージを作成
            image.src = blob_url //画像ファイルを読み込む
            //読み込み完了イベント
            image.onload = function(){
                $("#info_before").html("File-Size: "+getSizeStr(bin.length)+"<br>Type: "+type+"</br>Image-Size: "+this.naturalWidth + " x " + this.naturalHeight)
                let canvas = document.createElement("canvas") //キャンバスを作成
                let ctx = canvas.getContext('2d')
                //256x256より大きければサイズを縮小
                if(this.naturalWidth > 256 || this.naturalHeight > 256){
                    //縮小時のアスペクト値を維持するための計算
                    let resize = 256 / [this.naturalWidth, this.naturalHeight].sort()[1]
                    canvas.width = this.naturalWidth * resize
                    canvas.height = this.naturalHeight * resize
                    //あらかじめ白で塗りつぶす(透過色対策)
                    ctx.fillStyle="white";
                    ctx.fillRect(0,0,canvas.width,canvas.height);
                    //キャンバスへ縮小描画
                    ctx.drawImage(this,0,0,canvas.width,canvas.height)
                } else {
                    canvas.width = this.naturalWidth
                    canvas.height = this.naturalHeight
                    //あらかじめ白で塗りつぶす(透過色対策)
                    ctx.fillStyle="white";
                    ctx.fillRect(0,0,canvas.width,canvas.height);
                    //そのまま描画
                    ctx.drawImage(this,0,0)
                }
                //元のURLをバックアップ(あとで破棄)
                this.old_src = this.src
                //イメージ形式をJpegへ変換
                this.src = canvas.toDataURL()
                //再読込完了イベント
                this.onload = function(){
                    //変換後のURLをセット
                    $(".result").attr("src", this.src).css({"width": this.naturalWidth, "height": this.naturalHeight})
                    //URLからファイルサイズを取得する
                    var xhr = new XMLHttpRequest()
                    xhr.open("GET", this.src)
                    xhr.self = this
                    xhr.responseType = "arraybuffer"
                    xhr.onload = function() {
                        let bin = new Uint8Array(xhr.response)
                        //詳細表示
                        $("#info_after").html("File-Size: "+getSizeStr(bin.length)+"<br>Image-Size: "+this.self.naturalWidth + " x " + this.self.naturalHeight)
                    };
                    xhr.send();
                }
            }
        }
    }
    //ファイルサイズを単位で表示
    function getSizeStr(e){
        var t = ["Bytes", "KB", "MB", "GB", "TB"]
        if (0 === e) return "n/a"
        var n = parseInt(Math.floor(Math.log(e) / Math.log(1024)))
        return Math.round(e / Math.pow(1024, n)) + " " + t[n]
    }
    //加工後のイメージを<input type=file>に変換する
    function addFileList(input, url, file) {
        if (typeof url === 'string')
            url = [url]
        else if (!Array.isArray(url)) {
            throw new Error('url needs to be a file path string or an Array of file path strings')
        }
        const file_list = url.map(fp => file)
        file_list.__proto__ = Object.create(FileList.prototype)
        Object.defineProperty(input, 'files', {
            value: file_list
        })
        return input
    }
})
