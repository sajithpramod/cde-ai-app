export namespace development {
    let client: string;
    let connection: string | undefined;
    namespace migrations {
        let directory: string;
    }
    namespace seeds {
        let directory_1: string;
        export { directory_1 as directory };
    }
}
export namespace production {
    let client_1: string;
    export { client_1 as client };
    let connection_1: string | undefined;
    export { connection_1 as connection };
    export namespace migrations_1 {
        let directory_2: string;
        export { directory_2 as directory };
    }
    export { migrations_1 as migrations };
    export namespace seeds_1 {
        let directory_3: string;
        export { directory_3 as directory };
    }
    export { seeds_1 as seeds };
}
//# sourceMappingURL=knexfile.d.ts.map