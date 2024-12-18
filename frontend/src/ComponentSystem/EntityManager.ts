import { Entity } from "./Entity.ts";
import * as passes from "./passes.ts";

const ROOT_ = "__root__";

export class EntityManager {
  static #instance_: EntityManager;

  #root_!: Entity;
  #entitiesMap_: Record<string, Entity>;

  static Init() {
    this.#instance_ = new EntityManager();
    this.#instance_.#CreateRoot_();
    return this.#instance_;
  }

  static get Instance() {
    return this.#instance_;
  }

  constructor() {
    this.#entitiesMap_ = {};
  }

  get Entities() {
    return this.#entitiesMap_;
  }

  #CreateRoot_() {
    this.#root_ = new Entity(ROOT_);
    this.#root_.Init();
  }

  Debug() {
    console.log("🚀 EntityManager.ts ~ this.#entitiesMap_", this.#entitiesMap_);
  }

  /*** Clear all entities in the entitites map of the manager and reset the root entity
   * @param {string[]} keepEntities - List of entities to keep in the map
   */
  Clear(keepEntities: string[] = ["threeJSEntity"]) {
    for (const e in this.#entitiesMap_) {
      if (!keepEntities.includes(e) && e != "__root__") {
        this.Remove(e);
      }
    }
    this.#root_.Reset(keepEntities);
  }

  Remove(n: string): void {
    delete this.#entitiesMap_[n];
  }

  Get(n: string): Entity {
    return this.#entitiesMap_[n];
  }

  Add(child: Entity, parent: Entity | null) {
    this.#entitiesMap_[child.Name] = child;

    // Root check
    if (child.ID == this.#root_.ID) {
      parent = null;
    } else {
      parent = parent ? parent : this.#root_;
    }

    child.SetParent(parent);
  }

  Update(timeElapsed: number) {
    for (
      let i = passes.Passes.PASSES_MIN;
      i <= passes.Passes.PASSES_MAX;
      i = i << 1
    ) {
      this.UpdatePass_(timeElapsed, i);
    }
  }

  UpdatePass_(timeElapsedS: number, pass: number) {
    this.#root_.Update(timeElapsedS, pass);
  }
}
