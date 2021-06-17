import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket/socket.service';
import { Location } from '@angular/common';
import { ElementRef } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { first, take } from 'rxjs/operators';

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

  @ViewChild('chatArea', {static :true}) chatArea: ElementRef;

  constructor(private activatedRoute: ActivatedRoute,
    private socketService: SocketService,
    private router: Router,
    private location:Location,
    private nfs : NotifierService) { }

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

  this.socketService.receivedMsgEvent().subscribe((data)=> {
    console.log(data);
    this.messages.push(data.messageDetails);
    this.scrollBottom("pb-5");
  });

  }

  send() {
    let messageDetails = { sender: this.user , message : this.yourMessage };
    this.messages.push(messageDetails);
    this.socketService.sendMessage(messageDetails);
    this.yourMessage="";
    this.scrollBottom("pb-5");
  }

  scrollBottom(cssClass) {
       let objDiv = this.chatArea;
      //  console.log(objDiv);
       objDiv.nativeElement.classList.add(cssClass);
       objDiv.nativeElement.scrollTop = (objDiv.nativeElement.scrollHeight - objDiv.nativeElement.clientHeight);
       objDiv.nativeElement.classList.remove(cssClass);
  }

  disconnect() {
    console.log("Disconnecting");
    this.socketService.disconnect();
    this.router.navigate(['']);
  }


}

