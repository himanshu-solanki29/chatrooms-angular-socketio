import { ThrowStmt } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { SocketService } from '../socket/socket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  user;
  room;
  socketData;
  constructor(private socketService: SocketService,
    private nfs : NotifierService,
    private router: Router) {

      if(!this.socketService.isConnected()) {
        this.socketService.connect();
      }

      this.socketService.newUserJoined().subscribe((data) => {
        console.log(data);

        // if(data.data.roomDetails.lastJoinedBy === this.user)
        // this.nfs.notify('info',`You joined`);
        // else
        // this.nfs.notify('info',`${data.data.roomDetails.lastJoinedBy} Joined`);

        this.socketData = data;
        this.router.navigateByUrl(`room/${data.data.roomDetails.roomId}`,  { state :  this.socketData } );
      });
      this.socketService.invalidRoom().subscribe((data) => {
        console.log(data);

        this.nfs.notify('error',`Invalid room id ${ data }. Please check the roomId and try again.`);
      });

      this.socketService.invalidUserName().subscribe((data) => {
        this.nfs.notify('error',`User with user id ${ data } already exists in the room ${this.room}`);
      })
  }
  ngOnInit() {

  }

  createRoom() {
      if(this.user) {
        sessionStorage.setItem("username",this.user);
        this.socketService.joinRoom({ roomId : null, user: this.user });
      }
  }

  joinRoom() {
      if(this.room) {
        sessionStorage.setItem("username",this.user);
        this.socketService.joinRoom({ roomId : this.room, user: this.user });
      }
  }



}
