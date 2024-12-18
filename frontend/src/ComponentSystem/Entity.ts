/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";

import * as entity_manager from "./EntityManager.ts";
import { Component } from "./Component.ts";

const SCALE_1_ = new THREE.Vector3(1, 1, 1);

let IDS_ = 0;

export interface BaseMessage {
  topic: string;
  value: any;
  [key: string]: any;
}

export class Entity {
  id_: number;
  name_: string;
  components_: Record<string, Component>;
  attributes_: Record<string, any>;
  transform_: THREE.Matrix4;
  worldTransform_: THREE.Matrix4;
  position_: THREE.Vector3;
  rotation_: THREE.Quaternion;
  handlers_: Record<string, Function[]>;
  parent_: Entity | null;
  dead_: boolean;
  active_: boolean;
  childrenActive_: Entity[];
  children_: Entity[];

  constructor(name: string) {
    IDS_ += 1;

    this.id_ = IDS_;
    this.name_ = name ? name : this.GenerateName_();
    this.components_ = {};
    this.attributes_ = {};

    this.transform_ = new THREE.Matrix4();
    this.transform_.identity();
    this.worldTransform_ = new THREE.Matrix4();
    this.worldTransform_.identity();

    this.position_ = new THREE.Vector3();
    this.rotation_ = new THREE.Quaternion();

    this.handlers_ = {};
    this.parent_ = null;
    this.dead_ = false;
    this.active_ = true;

    this.childrenActive_ = [];
    this.children_ = [];
  }

  Destroy_() {
    for (const c of this.children_) {
      c.Destroy_();
    }
    for (const k in this.components_) {
      this.components_[k].Destroy();
    }
    this.childrenActive_ = [];
    this.children_ = [];
    this.components_ = {};
    this.parent_ = null;
    this.handlers_ = {};
    this.Manager.Remove(this.name_);
  }

  GenerateName_() {
    return "__name__" + this.id_;
  }

  RegisterHandler_(n: string, h: Function) {
    if (!(n in this.handlers_)) {
      this.handlers_[n] = [];
    }
    this.handlers_[n].push(h);
  }

  UnregisterHandler_(n: string, h: Function) {
    this.handlers_[n] = this.handlers_[n].filter((c) => c != h);
  }

  AddChild_(e: Entity) {
    this.children_.push(e);
    this.RefreshActiveChildren_();
  }

  RemoveChild_(e: Entity) {
    this.children_ = this.children_.filter((c) => c != e);
    this.RefreshActiveChildren_();
  }

  /*** Remove all children that are not in the list, and the children of those children
   * @param keepChildren - list of children to keep
   */
  Reset(keepChildren?: string[]) {
    keepChildren = keepChildren || [];
    for (const c of this.children_) {
      if (!keepChildren.includes(c.name_)) {
        c.Destroy_();
      }
    }
    this.children_ = this.children_.filter((c) =>
      keepChildren.includes(c.name_),
    );
    this.childrenActive_ = this.childrenActive_.filter((c) =>
      keepChildren.includes(c.name_),
    );
  }

  SetParent(p: Entity | null) {
    if (this.parent_) {
      this.parent_.RemoveChild_(this);
    }

    this.parent_ = p;

    if (this.parent_) {
      this.parent_.AddChild_(this);
    }
  }

  get Name() {
    return this.name_;
  }

  get ID() {
    return this.id_;
  }

  get Manager() {
    return entity_manager.EntityManager.Instance;
  }

  get Parent() {
    return this.parent_;
  }

  get Attributes() {
    return this.attributes_;
  }

  get Children() {
    return [...this.children_];
  }

  get IsDead() {
    return this.dead_;
  }

  get IsActive() {
    return this.active_;
  }

  RefreshActiveChildren_() {
    this.childrenActive_ = this.children_.filter((c) => c.IsActive);
  }

  SetActive(active: boolean) {
    this.active_ = active;
    if (this.parent_) {
      this.parent_.RefreshActiveChildren_();
    }
  }

  SetDead() {
    this.dead_ = true;
  }

  AddComponent(c: Component) {
    c.SetParent(this);
    this.components_[c.NAME] = c;

    c.InitComponent();
  }

  Init(parent: Entity | null = null) {
    this.Manager.Add(this, parent);
    this.InitEntity_();
  }

  InitEntity_() {
    for (const k in this.components_) {
      this.components_[k].InitEntity();
    }
    this.SetActive(this.active_);
  }

  GetComponent(n: string) {
    return this.components_[n];
  }

  FindEntity(name: string) {
    return this.Manager.Get(name);
  }

  FindChild(name: string, recursive: boolean): Entity | null {
    let result = null;

    for (let i = 0, n = this.children_.length; i < n; ++i) {
      if (this.children_[i].Name == name) {
        result = this.children_[i];
        break;
      }

      if (recursive) {
        result = this.children_[i].FindChild(name, recursive);
        if (result) {
          break;
        }
      }
    }
    return result;
  }

  Broadcast(msg: BaseMessage) {
    if (this.IsDead) {
      return;
    }
    if (!(msg.topic in this.handlers_)) {
      return;
    }

    for (const curHandler of this.handlers_[msg.topic]) {
      curHandler(msg);
    }
  }

  SetPosition(p: THREE.Vector3) {
    this.position_.copy(p);
    this.transform_.compose(this.position_, this.rotation_, SCALE_1_);
    this.Broadcast({
      topic: "update.position",
      value: this.position_,
    });
  }

  SetQuaternion(r: THREE.Quaternion) {
    this.rotation_.copy(r);
    this.transform_.compose(this.position_, this.rotation_, SCALE_1_);
    this.Broadcast({
      topic: "update.rotation",
      value: this.rotation_,
    });
  }

  get Transform() {
    return this.transform_;
  }

  get WorldTransform() {
    const m = this.worldTransform_.copy(this.transform_);
    if (this.parent_) {
      m.multiply(this.parent_.Transform);
    }
    return m;
  }

  GetWorldPosition(target: THREE.Vector3) {
    target.setFromMatrixPosition(this.WorldTransform);
    return target;
  }

  get Position() {
    return this.position_;
  }

  get Quaternion() {
    return this.rotation_;
  }

  get Forward() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  get Left() {
    const forward = new THREE.Vector3(-1, 0, 0);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  get Up() {
    const forward = new THREE.Vector3(0, 1, 0);
    forward.applyQuaternion(this.rotation_);
    return forward;
  }

  UpdateComponents_(timeElapsed: number, pass: number) {
    for (const k in this.components_) {
      const c = this.components_[k];
      if (c.Pass == pass) {
        c.Update(timeElapsed);
      }
    }
  }

  UpdateChildren_(timeElapsed: number, pass: number) {
    const dead = [];
    const alive = [];
    for (let i = 0; i < this.childrenActive_.length; ++i) {
      const e = this.childrenActive_[i];

      e.Update(timeElapsed, pass);

      if (e.IsDead) {
        dead.push(e);
      } else {
        alive.push(e);
      }
    }

    let hasDead = false;
    for (let i = 0; i < dead.length; ++i) {
      const e = dead[i];

      e.Destroy_();
      hasDead = true;
    }

    if (hasDead) {
      this.children_ = this.children_.filter((c) => !c.IsDead);
      this.RefreshActiveChildren_();
    }
  }

  Update(timeElapsed: number, pass: number) {
    this.UpdateComponents_(timeElapsed, pass);
    this.UpdateChildren_(timeElapsed, pass);
  }
}
