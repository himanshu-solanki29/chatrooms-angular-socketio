import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket;

  constructor() {
        this.connect();
  }

  isConnected() {
    return this.socket.connected;
  }

  connect() {
    this.socket = io(environment.socketUrl);
  }

  joinRoom(data) {
    this.socket.emit('join',data);
  }

  sendMessage(message) {
    this.socket.emit("new-message",message);
  }

  disconnect() {
    this.socket.disconnect();
  }

  userDisconnected() {
    return this.getEventObservable("user-disconnected");
  }

  receivedMsgEvent() {
    return this.getEventObservable("new-message");
  }

  newUserJoined() {
    return this.getEventObservable("new-user");
  }

  invalidRoom() {
   return this.getEventObservable("invalid-room");
  }

  invalidUserName() {
    return this.getEventObservable("invalid-user");
   }

  getEventObservable(eventName) {
    let observable = new Observable<any>((observer)=> {
      this.socket.on(eventName, (data)=> {
        observer.next(data);
      });
      return () => {
        console.log("some error");
        this.socket.disconnect(); }
    });
    return observable;
  }

}
