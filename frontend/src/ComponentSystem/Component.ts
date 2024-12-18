import { BaseMessage, Entity } from "./Entity";
import * as passes from "./passes.ts";

export class Component {
  parent_!: Entity;
  pass_: number;

  get NAME() {
    console.error("Unnamed Component: " + this.constructor.name);
    return "__UNNAMED__";
  }

  constructor() {
    //this.parent_ = null;
    this.pass_ = passes.Passes.DEFAULT;
  }

  Destroy() {}
  InitComponent() {}
  InitEntity() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Update(_timeElapsed: number) {}

  SetParent(parent: Entity) {
    this.parent_ = parent;
  }

  SetPass(pass: number) {
    this.pass_ = pass;
  }

  get Pass() {
    return this.pass_;
  }

  GetComponent(name: string) {
    return this.parent_.GetComponent(name);
  }

  get Manager() {
    return this.Parent.Manager;
  }

  get Parent() {
    return this.parent_;
  }

  FindEntity(name: string) {
    return this.Manager.Get(name);
  }

  Broadcast(m: BaseMessage) {
    this.parent_.Broadcast(m);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  RegisterHandler_(name: string, cb: Function) {
    this.parent_.RegisterHandler_(name, cb);
  }
}
