import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket/socket.service';
import { Location } from '@angular/common';
import { ElementRef } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { first, take } from 'rxjs/operators';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { stringify } from '@angular/compiler/src/util';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, AfterViewChecked, OnDestroy  {

  roomId;
  user;
  socketData;
  messages=[];
  yourMessage;
  base64String;
  bottomSheetRef;

  @ViewChild('chatArea', {static :true}) chatArea: ElementRef;

  constructor(protected activatedRoute: ActivatedRoute,
    protected socketService: SocketService,
    protected router: Router,
    protected location:Location,
    protected bottomSheet: MatBottomSheet,
    protected cdr : ChangeDetectorRef,
    protected nfs : NotifierService) {
        window.addEventListener('paste', (e:ClipboardEvent) => {
              // console.log("Pasted", e);


             for (let i = 0; i < e.clipboardData.items.length; i++) {
              var clipboardItem = e.clipboardData.items[i];
               console.log(clipboardItem);
              var type = clipboardItem.type;
              // console.log(type);
              if (type.indexOf("image") != -1) {
                 // get the image content and create an img dom element
                let blob = clipboardItem.getAsFile();

                this.openImageBottomSheet(blob);

                break;
              }
             }

        })
    }

  ngOnDestroy(): void {
    this.disconnect();
  }

  ngAfterViewChecked(): void {
  this.scrollBottom("pb-2");
  }


  ngOnInit() {

  // console.log(this.activatedRoute);

  this.user = sessionStorage.getItem("username");
  if(!this.user) {
    this.nfs.notify('error','Active session not found, Please join again');
    this.router.navigate(['']);
    return;
  }

   var data:any = this.location.getState();
   if(data.data){
    this.socketData = data.data;
    if(this.socketData.messages)
    this.messages = this.socketData.messages;
   } else {
     console.log("Joining");
    this.activatedRoute.params.subscribe(val=>{
      this.roomId = val.id;
      this.socketService.joinRoom({ roomId : this.roomId, user : this.user });
  });
   }

  //  if(!this.socketData) {
  //   this.socketService.joinRoom({ roomId : this.roomId });
  //  }

  this.socketService.newUserJoined().subscribe((data) => {

        // if(data.data.roomDetails.lastJoinedBy === this.user)
        // this.nfs.notify('info',`You joined`);
        // else
        // this.nfs.notify('info',`${data.data.roomDetails.lastJoinedBy} Joined`);


    this.socketData = data.data;
    console.log(this.socketData);
    if(this.socketData.messages)
    this.messages = this.socketData.messages;
  });

  this.socketService.userDisconnected().subscribe((data) => {
    console.log(data);
    let connectedClients = new Set(this.socketData.roomDetails.connectedClients);
    connectedClients.forEach((x:any) => (x.username === data.data) ? connectedClients.delete(x) : x);
    console.log(this.socketData.roomDetails.connectedClients);
    this.socketData.roomDetails.connectedClients = Array.from(connectedClients);
    console.log(this.socketData.roomDetails.connectedClients);
    // this.nfs.notify('info',`${ data.data } disconnected`);
  });

  this.socketService.invalidRoom().pipe().subscribe((data) => {
    this.nfs.notify('error',`Invalid room id ${ data }. Please check the roomId and try again.`);
    this.router.navigate(['']);
  });

  this.socketService.invalidUserName().subscribe((data) => {
    this.nfs.notify('error',`User with user id ${ data } already exists in the room ${this.roomId}`);
    this.router.navigate(['']);
  });

  this.socketService.receivedMsgEvent().subscribe((data)=> {
    console.log(data);
    this.messages.push(data.messageDetails);
    this.scrollBottom("pb-5");
  });

  }

  send(msgType) {

    let messageDetails = null;
    if(msgType == 'text') {
      messageDetails = this.perpareTextMsgDetails();
    } else if (msgType == 'image') {
      messageDetails = this.prepareImageMsgDetails();
    }

    if(messageDetails) {
    console.log("sending message", messageDetails);
    this.messages.push(messageDetails);
    this.socketService.sendMessage(messageDetails);
    this.yourMessage="";
    this.scrollBottom("pb-5");
   }

  }

  perpareTextMsgDetails() {
    return { sender: this.user , message : this.yourMessage, messageType: 'text', timestamp: new Date().getTime() };
  }

  prepareImageMsgDetails() {
      return { sender: this.user , message :  this.base64String, messageType: 'image', timestamp: new Date().getTime() };
  }

  scrollBottom(cssClass) {
       let objDiv = this.chatArea;
      //  console.log(objDiv);
      if(objDiv) {
        objDiv.nativeElement.classList.add(cssClass);
        objDiv.nativeElement.scrollTop = (objDiv.nativeElement.scrollHeight - objDiv.nativeElement.clientHeight);
        objDiv.nativeElement.classList.remove(cssClass);
      }

  }

  openImageBottomSheet(blob) {
    this.bottomSheetRef = this.bottomSheet.open(SendImageComponent, {
      data : blob
     });

     this.bottomSheetRef.afterDismissed().subscribe((data) => {
      if(data.base64String) {
        this.base64String = data.base64String;
        this.send('image');
      }

    });

  }

  displayChatDate(lastTimestamp, thisTimestamp) {
    let lastDate = new Date(lastTimestamp).getDate();
    let thisDate = new Date(thisTimestamp).getDate();
    if(lastDate === thisDate) return null;
    else return thisTimestamp;
  }

  sayLoud(msg:string) {
    if(msg)
    return msg.startsWith("h1:");
    else false;
  }

  isEmoji(str) {
    var ranges = [
        '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
    ];
    if (str.match(ranges.join('|'))) {
        return true;
    } else {
        return false;
    }
}

  disconnect() {
    console.log("Disconnecting");
    this.socketService.disconnect();
    this.router.navigate(['']);
  }


}

@Component({
  selector: 'app-send-image',
  templateUrl: 'send-image-bottom-sheet.html',
})
export class SendImageComponent{

  imgUrl;
  base64String;


  @ViewChild('image', {static :true}) image: ElementRef;

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data,
    private readonly sanitizer: DomSanitizer,
    protected bottomSheetRef: MatBottomSheetRef,
   ) {

    var blobUrl = (window as any).webkitURL.createObjectURL(data);
    this.imgUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
    // console.log( this.imgUrl);
    // console.log(data);
  }

  send() {
    this.bottomSheetRef.dismiss({ base64String : this.base64String });
  }

  ngAfterViewChecked(): void {
    let canvas = document.createElement('canvas');
    let img = this.image.nativeElement;
    // console.log(img);
    canvas.height = img.naturalHeight/2;
    canvas.width = img.naturalWidth/2;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // console.log(canvas.toDataURL());
    this.base64String = canvas.toDataURL();

  }

  ngOnDestroy() {

  }

}

