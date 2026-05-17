use std::path::{Component, Path, PathBuf};

/// Path-mode string stored in the `collections.path_mode` column.
pub const MODE_ABSOLUTE: &str = "absolute";
pub const MODE_PORTABLE_DRIVE: &str = "portable_drive";

/// Returns the Windows drive prefix of `path` (e.g. `"E:"`) if it has one.
/// Always `None` on non-Windows.
#[cfg(windows)]
pub fn drive_prefix(path: &Path) -> Option<String> {
    path.components().next().and_then(|c| match c {
        Component::Prefix(p) => Some(p.as_os_str().to_string_lossy().into_owned()),
        _ => None,
    })
}

#[cfg(not(windows))]
pub fn drive_prefix(_path: &Path) -> Option<String> {
    None
}

/// Drive prefix of the currently running executable, e.g. `"E:"`.
pub fn current_exe_drive() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| format!("current_exe failed: {}", e))?;
    drive_prefix(&exe).ok_or_else(|| "executable path has no drive prefix".to_string())
}

/// True iff `path` is on the same drive as the running executable.
pub fn is_on_exe_drive(path: &Path) -> bool {
    match (current_exe_drive(), drive_prefix(path)) {
        (Ok(exe), Some(p)) => exe.eq_ignore_ascii_case(&p),
        _ => false,
    }
}

/// Strip the drive prefix from an absolute Windows path.
/// `E:\eXoDOS` → `\eXoDOS`. Paths without a drive prefix pass through unchanged.
pub fn to_portable_form(path: &Path) -> String {
    let mut iter = path.components();
    if let Some(Component::Prefix(_)) = iter.clone().next() {
        iter.next();
        return iter.as_path().to_string_lossy().into_owned();
    }
    path.to_string_lossy().into_owned()
}

/// Resolve a stored collection path according to its mode.
/// - `absolute`: returned verbatim.
/// - `portable_drive`: the running exe's drive is prepended.
pub fn resolve_collection_path(stored: &str, mode: &str) -> Result<PathBuf, String> {
    match mode {
        MODE_PORTABLE_DRIVE => {
            let drive = current_exe_drive()?;
            let suffix = if stored.starts_with('\\') || stored.starts_with('/') {
                stored.to_string()
            } else {
                format!("\\{}", stored)
            };
            Ok(PathBuf::from(format!("{}{}", drive, suffix)))
        }
        _ => Ok(PathBuf::from(stored)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(windows)]
    #[test]
    fn drive_prefix_extracts_drive() {
        assert_eq!(drive_prefix(Path::new(r"E:\eXoDOS")).as_deref(), Some("E:"));
        assert_eq!(drive_prefix(Path::new(r"C:\foo\bar")).as_deref(), Some("C:"));
    }

    #[cfg(windows)]
    #[test]
    fn drive_prefix_none_for_relative() {
        assert_eq!(drive_prefix(Path::new(r"eXoDOS\foo")), None);
    }

    #[cfg(windows)]
    #[test]
    fn to_portable_form_strips_drive() {
        assert_eq!(to_portable_form(Path::new(r"E:\eXoDOS")), r"\eXoDOS");
        assert_eq!(
            to_portable_form(Path::new(r"F:\Games\eXoDOS")),
            r"\Games\eXoDOS"
        );
    }

    #[cfg(windows)]
    #[test]
    fn to_portable_form_passthrough_for_relative() {
        assert_eq!(to_portable_form(Path::new(r"eXoDOS")), "eXoDOS");
    }

    #[test]
    fn resolve_absolute_passthrough() {
        let p = resolve_collection_path(r"C:\Games\eXoDOS", MODE_ABSOLUTE).unwrap();
        assert_eq!(p, PathBuf::from(r"C:\Games\eXoDOS"));
    }

    #[cfg(windows)]
    #[test]
    fn resolve_portable_prepends_exe_drive() {
        let resolved = resolve_collection_path(r"\eXoDOS", MODE_PORTABLE_DRIVE).unwrap();
        let exe_drive = current_exe_drive().unwrap();
        assert_eq!(
            resolved,
            PathBuf::from(format!("{}{}", exe_drive, r"\eXoDOS"))
        );
    }

    #[cfg(windows)]
    #[test]
    fn resolve_portable_handles_missing_leading_separator() {
        let resolved = resolve_collection_path("eXoDOS", MODE_PORTABLE_DRIVE).unwrap();
        let exe_drive = current_exe_drive().unwrap();
        assert_eq!(
            resolved,
            PathBuf::from(format!("{}{}", exe_drive, r"\eXoDOS"))
        );
    }
}
